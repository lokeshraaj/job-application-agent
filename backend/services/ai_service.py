"""
AutoApply AI — AI Service (Groq Integration)
==============================================
Hybrid model strategy:
  - llama-3.3-70b-versatile  → User-facing tasks (resume analysis, pitch generation)
  - llama-3.1-8b-instant     → Background tasks (diff extraction, JSON memory formatting)

All functions accept an optional memory_context parameter to inject
learned preferences from Hindsight into the Groq system prompt.
"""

import os
import json
import logging
from groq import Groq
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

# --- Model Configuration ---
MODEL_HEAVY = "llama-3.3-70b-versatile"   # User-facing: resume parsing, pitch gen
MODEL_FAST  = "llama-3.1-8b-instant"      # Background: diffs, JSON extraction


def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "mock_key_for_testing":
        return None
    return Groq(api_key=api_key)


def analyze_resume(text: str) -> str:
    """
    Prompts Groq (heavy model) to extract structured data from the resume.
    Returns JSON formatted string with skills, scores, and feedback.
    """
    client = get_groq_client()
    if not client:
        raise ValueError("GROQ_API_KEY missing from environment variables.")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a brutally honest Senior Technical Recruiter evaluating a resume "
                "for an experienced software engineer (5+ years). Extract exact information "
                "and evaluate strictly. Deduct points heavily for: 1. Lack of quantifiable "
                "metrics. 2. Missing core technologies. 3. Poorly structured summaries. "
                "Also analyze for 'Good' traits (e.g. Action Verbs, Tech Stack Depth) and "
                "'Bad' traits (e.g. Vague bullet points, Missing Contact Info, Weak Summary). "
                "Output ONLY valid JSON following this schema: "
                '{"skills": [], "experience_years": int, "professional_summary": "string", '
                '"format_score": int (0-100), "keyword_score": int (0-100), '
                '"impact_score": int (0-100), "total_ats_score": int (0-100), '
                '"strengths": ["strings"], "improvements": ["strings"]}. '
                "Do not write Markdown wrappers like ```json"
            ),
        },
        {
            "role": "user",
            "content": f"Analyze the following resume text and provide the structured JSON Output:\n\n{text[:5000]}",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_HEAVY,
            messages=messages,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)

        # Enforce strict schema bounds so frontend React doesn't crash on undefined
        if not isinstance(data.get("skills"), list):
            data["skills"] = []
        if not isinstance(data.get("experience_years"), (int, float)):
            data["experience_years"] = 0
        if not isinstance(data.get("professional_summary"), str):
            data["professional_summary"] = "Summary unavailable due to LLM format error."
        if not isinstance(data.get("format_score"), (int, float)):
            data["format_score"] = 0
        if not isinstance(data.get("keyword_score"), (int, float)):
            data["keyword_score"] = 0
        if not isinstance(data.get("impact_score"), (int, float)):
            data["impact_score"] = 0
        if not isinstance(data.get("total_ats_score"), (int, float)):
            data["total_ats_score"] = data.get("ats_score", 0)
        if not isinstance(data.get("strengths"), list):
            data["strengths"] = []
        if not isinstance(data.get("improvements"), list):
            data["improvements"] = []

        # Ensure backward compatibility with existing ats_score reference
        data["ats_score"] = data["total_ats_score"]

        return json.dumps(data)

    except json.JSONDecodeError:
        logger.error("Groq JSON parsing failed in analyze_resume.")
        return json.dumps({
            "skills": [], "experience_years": 0,
            "professional_summary": "LLM failed to return a correct JSON structure.",
            "format_score": 0, "keyword_score": 0, "impact_score": 0,
            "total_ats_score": 0, "strengths": [], "improvements": [], "ats_score": 0,
        })
    except Exception as e:
        logger.error("Groq API Error in analyze_resume: %s", e)
        raise ValueError(f"Groq API connection or processing error: {str(e)}")


def generate_match_score(resume_text: str, job_description: str) -> dict:
    """
    Calculates an ATS match score (0-100) with suggestions.
    Uses the fast model since this runs during quick-apply.
    """
    client = get_groq_client()
    if not client:
        return {"ats_score": 0, "suggestions": ["Provide GROQ_API_KEY in backend .env to enable the agent."]}

    logger.info("Generating match score for resume")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior technical recruiter matching an experienced engineer's "
                "resume against a job description. Return your analysis as a JSON object "
                "with strictly these keys: "
                '{"ats_score": number_0_to_100, "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]}. '
                "Do not wrap the JSON in Markdown."
            ),
        },
        {
            "role": "user",
            "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nRESUME:\n{resume_text[:5000]}",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_FAST,
            messages=messages,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)

        if not isinstance(data.get("ats_score"), (int, float)):
            data["ats_score"] = 0
        if not isinstance(data.get("suggestions"), list):
            data["suggestions"] = ["Make sure your resume matches the job description closer."]

        return data
    except Exception as e:
        logger.warning("Groq API Error in generate_match_score: %s", e)
        return {"ats_score": 0, "suggestions": ["Error connecting to AI service."]}


def generate_pitch(
    resume_text: str,
    job_description: str,
    memory_context: str | None = None,
) -> str:
    """
    Generates a persuasive cold email / pitch (under 150 words) from the
    candidate to the hiring manager.

    HINDSIGHT INTEGRATION: If memory_context is provided, it is injected
    into the system prompt so Groq can tailor the pitch to the user's
    learned stylistic preferences from past edits and successful interviews.

    Uses the heavy model (llama-3.3-70b-versatile) for maximum quality.
    """
    client = get_groq_client()
    if not client:
        return "Configure GROQ_API_KEY in the backend to enable AI Pitch generation."

    logger.info("Generating AI Outreach Pitch (memory_context=%s)", "YES" if memory_context else "NO")

    # Build the system prompt with optional memory injection
    system_prompt = (
        "You are an elite Silicon Valley recruiter software. Your sole purpose is "
        "to write a highly persuasive, concise cold email or pitch (under 150 words) "
        "from the candidate to the hiring manager. Blend the candidate's skills with "
        "the job requirements. Keep it professional, punchy, and confident. "
        "Do NOT use placeholders like [Insert Date], use the best available information."
    )

    if memory_context:
        system_prompt += (
            "\n\n--- AGENT MEMORY (Hindsight) ---\n"
            "The following context represents what you have LEARNED about this user's "
            "preferences from their past edits, successful interviews, and feedback. "
            "You MUST incorporate these learned patterns into the pitch:\n\n"
            f"{memory_context}\n"
            "--- END AGENT MEMORY ---\n\n"
            "Apply these learned preferences to craft a pitch that aligns with "
            "what has historically worked for this user."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"JOB DESCRIPTION:\n{job_description[:2000]}\n\nRESUME:\n{resume_text[:5000]}\n\nWrite the pitch:",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_HEAVY,
            messages=messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.warning("Groq API Error in generate_pitch: %s", e)
        return "We encountered an error generating the pitch. Please try again."


def generate_tailored_resume(
    resume_text: str,
    job_description: str,
    memory_context: str | None = None,
) -> str:
    """
    Generates a JD-tailored version of the user's resume in clean Markdown.

    The LLM re-orders skills, rewrites bullet points to mirror the vocabulary
    and priorities of the target job description, and restructures sections
    for maximum ATS relevance.

    HINDSIGHT INTEGRATION: If memory_context is provided (learned phrasing
    preferences from past resume edits), those patterns are injected into
    the system prompt so Groq applies the user's preferred wording style.

    Uses the heavy model (llama-3.3-70b-versatile) for maximum quality.
    """
    client = get_groq_client()
    if not client:
        return "Configure GROQ_API_KEY in the backend to enable AI Resume Tailoring."

    logger.info("Generating tailored resume (memory_context=%s)", "YES" if memory_context else "NO")

    system_prompt = (
        "You are an elite resume optimization engine for experienced software engineers. "
        "Your task is to REWRITE the candidate's resume to be perfectly tailored for the "
        "target job description. Follow these rules strictly:\n\n"
        "1. **Re-order skills**: Put the most JD-relevant skills first.\n"
        "2. **Rewrite bullet points**: Mirror the exact vocabulary, technologies, and "
        "priorities mentioned in the JD. Replace generic phrasing with specific, "
        "quantifiable achievements that align with the role.\n"
        "3. **Restructure sections**: Lead with the most relevant experience.\n"
        "4. **Preserve truth**: Do NOT fabricate experience. Only reframe existing "
        "achievements to highlight their relevance to this specific role.\n"
        "5. **Use metrics**: Wherever possible, include quantifiable results "
        "(percentages, dollar amounts, user counts, latency reductions).\n\n"
        "Output the resume as clean, well-structured Markdown with these sections:\n"
        "## Professional Summary\n"
        "## Technical Skills\n"
        "## Professional Experience\n"
        "## Education\n\n"
        "Use **bold** for company names and job titles. Use bullet points (- ) for "
        "achievements. Keep the total length under 800 words. Do NOT include any "
        "explanatory text outside the resume itself."
    )

    if memory_context:
        system_prompt += (
            "\n\n--- AGENT MEMORY (Hindsight) ---\n"
            "The following context represents LEARNED PREFERENCES about how this user "
            "likes their resume bullets phrased. You MUST apply these patterns:\n\n"
            f"{memory_context}\n"
            "--- END AGENT MEMORY ---\n\n"
            "Apply these learned phrasing preferences when rewriting the bullet points."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"TARGET JOB DESCRIPTION:\n{job_description[:2000]}\n\n"
                f"ORIGINAL RESUME:\n{resume_text[:5000]}\n\n"
                "Generate the tailored resume in Markdown:"
            ),
        },
    ]

    try:
        print(f"[AI SERVICE] Calling Groq model={MODEL_HEAVY} for tailored resume...")
        print(f"[AI SERVICE] System prompt length: {len(system_prompt)}, user content length: {len(messages[1]['content'])}")
        response = client.chat.completions.create(
            model=MODEL_HEAVY,
            messages=messages,
        )
        result = response.choices[0].message.content
        print(f"[AI SERVICE] Groq returned tailored resume: {len(result) if result else 0} chars")
        return result
    except Exception as e:
        print(f"[AI SERVICE] GROQ ERROR in generate_tailored_resume: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        logger.warning("Groq API Error in generate_tailored_resume: %s", e)
        return "We encountered an error tailoring the resume. Please try again."
