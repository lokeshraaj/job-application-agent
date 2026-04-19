"""
AutoApply AI -- Hindsight Memory Service (Async)
=================================================
Wraps the official Vectorize Hindsight Python SDK (hindsight-client)
to provide persistent agent memory via Hindsight Cloud.

All public functions are async to run natively on FastAPI's event loop.
The SDK's async methods (acreate_bank, aretain, arecall, areflect) are
used directly -- no sync wrappers -- avoiding the aiohttp
"Timeout context manager should be used inside a task" RuntimeError.

IMPORTANT: Each operation creates a fresh Hindsight client and closes it
after use. aiohttp.ClientSession objects are bound to the async task that
created them, so a singleton client causes cross-task RuntimeErrors.

Memory Bank Architecture:
  - One bank per user: "autoapply-user-{user_id}"
  - Mission: career agent focused on learning pitch style preferences
  - Disposition: empathetic (4), low skepticism (2), flexible (2)

Core Operations:
  retain  -> Store memories (resume profile, pitch edits, outcomes)
  recall  -> Retrieve memories (preferences, full log)
  reflect -> Generate disposition-aware reasoning for pitch generation
"""

import os
import json
import difflib
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client factory -- creates a fresh client per async context
# ---------------------------------------------------------------------------
# Cache credentials (not the client) to avoid re-reading .env on every call
_credentials_loaded = False
_api_key: Optional[str] = None
_base_url: str = "https://api.hindsight.vectorize.io"


def _load_credentials():
    """Load and cache Hindsight credentials from .env (once)."""
    global _credentials_loaded, _api_key, _base_url

    if _credentials_loaded:
        return

    load_dotenv(override=True)
    _api_key = os.getenv("HINDSIGHT_API_KEY")
    _base_url = os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io")
    _credentials_loaded = True

    print(f"[HINDSIGHT DEBUG] API Key present: {bool(_api_key)}, Key prefix: {_api_key[:12] + '...' if _api_key else 'NONE'}")
    print(f"[HINDSIGHT DEBUG] Base URL: {_base_url}")

    if not _api_key:
        logger.warning(
            "HINDSIGHT_API_KEY not set -- Hindsight memory features are disabled. "
            "Sign up at https://ui.hindsight.vectorize.io/signup"
        )
        print("[HINDSIGHT DEBUG] [FAIL] NO API KEY FOUND -- check .env file")


@asynccontextmanager
async def _get_client():
    """
    Async context manager that yields a fresh Hindsight client.
    The client (and its aiohttp session) is created and closed within
    the same async task, avoiding cross-task RuntimeErrors.

    Usage:
        async with _get_client() as client:
            if client is None:
                return  # no credentials
            await client.aretain(...)
    """
    _load_credentials()

    if not _api_key:
        yield None
        return

    from hindsight_client import Hindsight

    client = Hindsight(
        base_url=_base_url,
        api_key=_api_key,
        timeout=30.0,
    )
    try:
        yield client
    finally:
        # Close the aiohttp session to avoid ResourceWarning
        try:
            await client.aclose()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Bank helpers
# ---------------------------------------------------------------------------
BANK_MISSION = (
    "You are an elite AI career agent for experienced software engineers. "
    "Your mission is to learn and track the user's stylistic preferences for "
    "cold-email pitches, resume presentation choices, preferred companies and "
    "roles, salary expectations, and interview outcomes. Use this knowledge to "
    "continuously improve the quality and success rate of job applications. "
    "Prioritize patterns that led to interview invitations."
)


def _bank_id(user_id: int) -> str:
    """Deterministic bank ID per user."""
    return f"autoapply-user-{user_id}"


async def _ensure_bank(client, user_id: int) -> bool:
    """
    Creates the user's memory bank if it doesn't already exist.
    Expects a live client -- call within an _get_client() context.
    Returns True if bank is ready.
    """
    bank = _bank_id(user_id)
    print(f"[HINDSIGHT DEBUG] Creating bank: {bank}")
    try:
        result = await client.acreate_bank(
            bank_id=bank,
            name=f"AutoApply Agent -- User {user_id}",
            reflect_mission=BANK_MISSION,
            disposition={
                "skepticism": 2,
                "literalism": 2,
                "empathy": 4,
            },
        )
        print(f"[HINDSIGHT DEBUG] [OK] Bank created/updated: {bank} -> {result}")
        logger.info("Created/updated Hindsight bank: %s", bank)
        return True
    except Exception as e:
        err_str = str(e).lower()
        status = getattr(e, "status", None)
        print(f"[HINDSIGHT DEBUG] Bank create exception: {type(e).__name__} (status={status}): {e}")

        if status == 409 or "already exists" in err_str or "conflict" in err_str:
            print(f"[HINDSIGHT DEBUG] [OK] Bank already exists (OK): {bank}")
            logger.debug("Bank %s already exists -- continuing.", bank)
            return True

        logger.warning("_ensure_bank(%s) failed: %s", bank, e)
        return True  # Optimistic


async def ensure_bank_exists(user_id: int) -> bool:
    """
    Public wrapper -- creates a client, ensures bank, closes client.
    """
    async with _get_client() as client:
        if not client:
            print(f"[HINDSIGHT DEBUG] ensure_bank_exists: client is None for user {user_id}")
            return False
        return await _ensure_bank(client, user_id)


# ---------------------------------------------------------------------------
# RETAIN operations -- store memories (all async)
# ---------------------------------------------------------------------------
async def retain_resume_profile(user_id: int, skills: list, summary: str, experience_years: int) -> bool:
    """
    Seeds Hindsight with the user's resume profile after PDF parsing.
    This gives the agent baseline context about who the user is.
    """
    print(f"[HINDSIGHT DEBUG] retain_resume_profile called: user={user_id}, skills={skills[:5]}, yoe={experience_years}")

    async with _get_client() as client:
        if not client:
            print("[HINDSIGHT DEBUG] [FAIL] retain_resume_profile: client is None")
            return False

        await _ensure_bank(client, user_id)
        bank = _bank_id(user_id)

        content = (
            f"[RESUME PROFILE] The user is an experienced software engineer with "
            f"{experience_years} years of experience. "
            f"Core skills: {', '.join(skills[:15])}. "
            f"Professional summary: {summary}"
        )

        print(f"[HINDSIGHT DEBUG] Sending retain to bank={bank}, content_len={len(content)}")
        try:
            result = await client.aretain(
                bank_id=bank,
                content=content,
                context="resume_upload",
                metadata={"source": "resume_parser", "skills_count": str(len(skills))},
            )
            print(f"[HINDSIGHT DEBUG] [OK] retain_resume_profile SUCCESS: {result}")
            logger.info("Retained resume profile for user %d (%d skills)", user_id, len(skills))
            return True
        except Exception as e:
            print(f"[HINDSIGHT DEBUG] [FAIL] retain_resume_profile FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            logger.error("retain_resume_profile failed: %s", e)
            return False


async def retain_pitch_edit(
    user_id: int,
    original_pitch: str,
    edited_pitch: str,
    job_title: str,
    company: str,
) -> bool:
    """
    When a user edits an AI-generated pitch, compute the diff and store
    the stylistic preference as a memory. This is the core learning loop.
    """
    print(f"[HINDSIGHT DEBUG] retain_pitch_edit called: user={user_id}, job={job_title} @ {company}")

    async with _get_client() as client:
        if not client:
            print("[HINDSIGHT DEBUG] [FAIL] retain_pitch_edit: client is None")
            return False

        await _ensure_bank(client, user_id)
        bank = _bank_id(user_id)

        diff_summary = _compute_edit_summary(original_pitch, edited_pitch)
        print(f"[HINDSIGHT DEBUG] Diff summary: {diff_summary}")

        content = (
            f"[PITCH EDIT FEEDBACK] For the role '{job_title}' at {company}, "
            f"the user edited the AI-generated cold email. "
            f"Changes observed: {diff_summary}. "
            f"The user's final version was: \"{edited_pitch[:500]}\""
        )

        print(f"[HINDSIGHT DEBUG] Sending retain to bank={bank}, content_len={len(content)}")
        try:
            result = await client.aretain(
                bank_id=bank,
                content=content,
                context="pitch_edit_learning",
                metadata={
                    "source": "pitch_editor",
                    "job_title": job_title,
                    "company": company,
                    "edit_type": "user_correction",
                },
            )
            print(f"[HINDSIGHT DEBUG] [OK] retain_pitch_edit SUCCESS: {result}")
            logger.info("Retained pitch edit for user %d -- job: %s @ %s", user_id, job_title, company)
            return True
        except Exception as e:
            print(f"[HINDSIGHT DEBUG] [FAIL] retain_pitch_edit FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            logger.error("retain_pitch_edit failed: %s", e)
            return False


async def retain_resume_edit(
    user_id: int,
    original_resume: str,
    edited_resume: str,
    job_title: str,
    company: str,
) -> bool:
    """
    When a user edits an AI-tailored resume, compute the diff and store
    the bullet-point phrasing preference as a memory. This is the resume
    counterpart to the pitch edit learning loop.
    """
    print(f"[HINDSIGHT DEBUG] retain_resume_edit called: user={user_id}, job={job_title} @ {company}")

    async with _get_client() as client:
        if not client:
            print("[HINDSIGHT DEBUG] [FAIL] retain_resume_edit: client is None")
            return False

        await _ensure_bank(client, user_id)
        bank = _bank_id(user_id)

        diff_summary = _compute_edit_summary(original_resume, edited_resume)
        print(f"[HINDSIGHT DEBUG] Resume diff summary: {diff_summary}")

        content = (
            f"[RESUME EDIT FEEDBACK] For the role '{job_title}' at {company}, "
            f"the user edited the AI-tailored resume. "
            f"Changes observed: {diff_summary}. "
            f"The user's preferred bullet-point phrasing: \"{edited_resume[:600]}\""
        )

        print(f"[HINDSIGHT DEBUG] Sending resume retain to bank={bank}, content_len={len(content)}")
        try:
            result = await client.aretain(
                bank_id=bank,
                content=content,
                context="resume_tailoring_learning",
                metadata={
                    "source": "resume_editor",
                    "job_title": job_title,
                    "company": company,
                    "edit_type": "resume_bullet_correction",
                },
            )
            print(f"[HINDSIGHT DEBUG] [OK] retain_resume_edit SUCCESS: {result}")
            logger.info("Retained resume edit for user %d -- job: %s @ %s", user_id, job_title, company)
            return True
        except Exception as e:
            print(f"[HINDSIGHT DEBUG] [FAIL] retain_resume_edit FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            logger.error("retain_resume_edit failed: %s", e)
            return False


async def retain_interview_outcome(
    user_id: int,
    job_title: str,
    company: str,
    pitch_text: str,
    match_score: float,
) -> bool:
    """
    When a Kanban card moves to "Interview Scheduled," store this as a
    high-signal success event. The A/B Testing Feedback Loop -- the agent
    learns which pitch formats actually convert to interviews.
    """
    async with _get_client() as client:
        if not client:
            return False

        await _ensure_bank(client, user_id)
        bank = _bank_id(user_id)

        content = (
            f"[INTERVIEW SUCCESS -- HIGH PRIORITY] The pitch for '{job_title}' at "
            f"{company} resulted in an interview invitation. Match score was "
            f"{match_score}%. This pitch format and tone should be heavily weighted "
            f"for future applications to similar roles. "
            f"Winning pitch: \"{pitch_text[:800]}\""
        )

        try:
            await client.aretain(
                bank_id=bank,
                content=content,
                context="interview_success_signal",
                metadata={
                    "source": "kanban_transition",
                    "outcome": "interview_scheduled",
                    "job_title": job_title,
                    "company": company,
                    "match_score": str(match_score),
                    "signal_weight": "high",
                },
            )
            logger.info(
                "Retained interview success for user %d -- %s @ %s (score: %.0f%%)",
                user_id, job_title, company, match_score,
            )
            return True
        except Exception as e:
            logger.error("retain_interview_outcome failed: %s", e)
            return False


# ---------------------------------------------------------------------------
# RECALL operations -- retrieve memories (all async)
# ---------------------------------------------------------------------------
async def recall_preferences(user_id: int, context: str = "generating a pitch") -> str:
    """
    Recalls the user's learned preferences from Hindsight.
    Returns a formatted string suitable for injection into Groq prompts.
    """
    async with _get_client() as client:
        if not client:
            return ""

        bank = _bank_id(user_id)

        try:
            results = await client.arecall(
                bank_id=bank,
                query=(
                    "What are this user's stylistic preferences for cold emails, "
                    "job application pitches, and resume bullet-point phrasing? "
                    "What pitch formats led to interviews? What tone, length, and "
                    "structure does the user prefer? How does the user like to "
                    "describe their achievements -- using cost-saving metrics, "
                    "latency metrics, team leadership framing, or technical depth?"
                ),
                types=["world", "observation", "experience"],
                budget="mid",
                max_tokens=2048,
            )

            if not results or not results.results:
                return ""

            # Concatenate top recall results into a context string
            memories = []
            for r in results.results[:8]:
                memories.append(f"- {r.text}")

            context_str = "\n".join(memories)
            logger.info(
                "Recalled %d preference memories for user %d",
                len(memories), user_id,
            )
            return context_str
        except Exception as e:
            logger.error("recall_preferences failed: %s", e)
            return ""


async def recall_memory_log(user_id: int, limit: int = 50) -> list:
    """
    Returns all memories for the Agent Memory Log UI panel.
    Each entry includes type, text, and timestamp.
    """
    async with _get_client() as client:
        if not client:
            print(f"[HINDSIGHT DEBUG] recall_memory_log: client is None for user {user_id}")
            return []

        bank = _bank_id(user_id)
        print(f"[HINDSIGHT DEBUG] recall_memory_log: fetching from bank={bank}")

        try:
            # Use the underlying async API directly since there's no public alist_memories()
            memories = await client._memory_api.list_memories(
                bank_id=bank,
                limit=limit,
                offset=0,
                _request_timeout=client._timeout,
            )

            # DEBUG: Inspect the raw response from the SDK
            print(f"[HINDSIGHT DEBUG] list_memories raw type: {type(memories)}")
            print(f"[HINDSIGHT DEBUG] list_memories raw value: {memories}")
            if memories:
                print(f"[HINDSIGHT DEBUG] list_memories dir: {[a for a in dir(memories) if not a.startswith('_')]}")

            log_entries = []
            # Try multiple response shapes
            if memories and hasattr(memories, "items"):
                items = memories.items
                print(f"[HINDSIGHT DEBUG] Using .items accessor, count={len(items) if items else 0}")
            elif memories and hasattr(memories, "memories"):
                items = memories.memories
                print(f"[HINDSIGHT DEBUG] Using .memories accessor, count={len(items) if items else 0}")
            elif memories and hasattr(memories, "results"):
                items = memories.results
                print(f"[HINDSIGHT DEBUG] Using .results accessor, count={len(items) if items else 0}")
            elif isinstance(memories, list):
                items = memories
                print(f"[HINDSIGHT DEBUG] Response is raw list, count={len(items)}")
            elif isinstance(memories, dict):
                items = memories.get("items", memories.get("memories", memories.get("results", [])))
                print(f"[HINDSIGHT DEBUG] Response is dict, keys={list(memories.keys())}, items count={len(items)}")
            else:
                items = []
                print(f"[HINDSIGHT DEBUG] Unknown response shape, defaulting to empty")

            for i, mem in enumerate(items):
                if i == 0:
                    print(f"[HINDSIGHT DEBUG] First memory item type: {type(mem)}")
                    print(f"[HINDSIGHT DEBUG] First memory item: {mem}")
                    if hasattr(mem, '__dict__'):
                        print(f"[HINDSIGHT DEBUG] First memory __dict__: {mem.__dict__}")
                    elif isinstance(mem, dict):
                        print(f"[HINDSIGHT DEBUG] First memory keys: {list(mem.keys())}")

                # Handle both object and dict responses
                if isinstance(mem, dict):
                    entry = {
                        "id": str(mem.get("id", str(hash(mem.get("text", "")))[:8])),
                        "type": mem.get("type", "world"),
                        "text": mem.get("text", str(mem)),
                        "created_at": mem.get("created_at", mem.get("timestamp", datetime.utcnow().isoformat())),
                        "trend": mem.get("trend", "stable"),
                        "proof_count": mem.get("proof_count", 1),
                    }
                else:
                    entry = {
                        "id": str(getattr(mem, "id", None) or str(hash(getattr(mem, "text", "")))[:8]),
                        "type": getattr(mem, "type", "world"),
                        "text": getattr(mem, "text", str(mem)),
                        "created_at": (
                            getattr(mem, "created_at", None)
                            or getattr(mem, "timestamp", None)
                            or datetime.utcnow().isoformat()
                        ),
                        "trend": getattr(mem, "trend", "stable"),
                        "proof_count": getattr(mem, "proof_count", 1),
                    }

                # Make timestamps serializable
                if hasattr(entry["created_at"], "isoformat"):
                    entry["created_at"] = entry["created_at"].isoformat()

                log_entries.append(entry)

            print(f"[HINDSIGHT DEBUG] [OK] recall_memory_log returning {len(log_entries)} entries for user {user_id}")
            logger.info("Retrieved %d memory log entries for user %d", len(log_entries), user_id)
            return log_entries
        except Exception as e:
            print(f"[HINDSIGHT DEBUG] [FAIL] recall_memory_log FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            logger.error("recall_memory_log failed: %s", e)
            return []


# ---------------------------------------------------------------------------
# REFLECT operations -- agentic reasoning (async)
# ---------------------------------------------------------------------------
async def reflect_for_pitch(user_id: int, job_description: str, resume_text: str) -> str:
    """
    Uses Hindsight's reflect() to generate a disposition-aware analysis
    of what the pitch should contain, based on all past learnings.
    This output is then fed to Groq for final pitch generation.
    """
    async with _get_client() as client:
        if not client:
            return ""

        bank = _bank_id(user_id)

        try:
            answer = await client.areflect(
                bank_id=bank,
                query=(
                    f"Based on everything you know about this user's preferences, "
                    f"past pitch edits, and interview success patterns, what specific "
                    f"guidance should be followed when writing a cold email for this role? "
                    f"Job description excerpt: {job_description[:1000]}"
                ),
                budget="mid",
                context="pitch_generation",
            )

            if answer and hasattr(answer, "text"):
                logger.info("Reflect generated pitch guidance for user %d", user_id)
                return answer.text
            return ""
        except Exception as e:
            logger.error("reflect_for_pitch failed: %s", e)
            return ""


# ---------------------------------------------------------------------------
# Utility: diff computation (sync -- pure CPU, no I/O)
# ---------------------------------------------------------------------------
def _compute_edit_summary(original: str, edited: str) -> str:
    """
    Generates a human-readable summary of what the user changed
    between the AI-generated pitch and their edited version.
    Uses difflib for line-level diff, then summarizes key patterns.
    """
    orig_lines = original.strip().splitlines()
    edit_lines = edited.strip().splitlines()

    differ = difflib.unified_diff(orig_lines, edit_lines, lineterm="")
    additions = []
    removals = []

    for line in differ:
        if line.startswith("+") and not line.startswith("+++"):
            additions.append(line[1:].strip())
        elif line.startswith("-") and not line.startswith("---"):
            removals.append(line[1:].strip())

    summary_parts = []

    if removals:
        summary_parts.append(f"Removed {len(removals)} lines/phrases")
    if additions:
        summary_parts.append(f"Added {len(additions)} lines/phrases")

    # Detect common patterns
    orig_lower = original.lower()
    edit_lower = edited.lower()

    if len(edited) < len(original) * 0.8:
        summary_parts.append("Significantly shortened the pitch")
    elif len(edited) > len(original) * 1.2:
        summary_parts.append("Expanded the pitch with more detail")

    if orig_lower.count("!") > edit_lower.count("!"):
        summary_parts.append("Reduced exclamation marks (prefers calmer tone)")
    if "dear" in orig_lower and "dear" not in edit_lower:
        summary_parts.append("Removed formal salutation")
    if any(word in edit_lower and word not in orig_lower for word in ["metrics", "revenue", "scale", "%", "users"]):
        summary_parts.append("Added quantifiable metrics and data points")

    # Word count analysis
    orig_words = len(original.split())
    edit_words = len(edited.split())
    summary_parts.append(f"Word count: {orig_words} -> {edit_words}")

    return "; ".join(summary_parts) if summary_parts else "Minor formatting adjustments"
