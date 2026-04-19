"""
AutoApply AI -- Apply Router (Hindsight-Enhanced)
==================================================
Handles job applications, Kanban status transitions, pitch generation
with memory context, tailored resume generation, and the edit-and-learn
feedback loop for both pitches and resumes.

CRITICAL: All Hindsight retain calls use FastAPI BackgroundTasks.
Since the service functions are now native coroutines, FastAPI will
run them on the main event loop (not in a thread pool), avoiding the
aiohttp "Timeout context manager" RuntimeError.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db
from services.ai_service import generate_match_score, generate_pitch, generate_tailored_resume
from services.hindsight_service import (
    retain_interview_outcome,
    retain_pitch_edit,
    retain_resume_edit,
    recall_preferences,
    reflect_for_pitch,
)

router = APIRouter(
    prefix="/apply",
    tags=["apply"],
)


@router.post("", response_model=schemas.ApplicationResponse)
def apply_for_job(resume_id: int, job_id: int, db: Session = Depends(get_db)):
    """Apply for a job -- generates match score via Groq."""
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()

    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or Job not found")

    analysis = generate_match_score(resume.raw_text or "", job.description or "")

    db_app = models.Application(
        resume_id=resume.id,
        job_id=job.id,
        kanban_column="Applied",
        status="Applied",
        match_score=analysis.get("ats_score", 0),
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@router.get("", response_model=List[schemas.ApplicationResponse])
def get_applications(db: Session = Depends(get_db)):
    """Fetch all applications for the Kanban board."""
    return db.query(models.Application).all()


@router.patch("/{app_id}", response_model=schemas.ApplicationResponse)
async def update_application_status(
    app_id: int,
    status: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Update the Kanban column for an application.

    HINDSIGHT TRIGGER: When the status transitions to "Interview Scheduled",
    this fires a background task to retain the pitch as a high-weight
    success signal in Hindsight -- the A/B Testing Feedback Loop.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = app.kanban_column
    app.kanban_column = status
    app.status = status
    db.commit()
    db.refresh(app)

    # --- A/B Testing Feedback Loop ---
    if status == "Interview Scheduled" and old_status != "Interview Scheduled":
        job = app.job
        job_title = job.title if job else f"Job #{app.job_id}"
        company = job.company if job else "Unknown"
        pitch_text = app.edited_email or app.cold_email or app.cover_letter or ""

        if pitch_text:
            background_tasks.add_task(
                retain_interview_outcome,
                user_id=app.resume.owner.id if app.resume and app.resume.owner else 1,
                job_title=job_title,
                company=company,
                pitch_text=pitch_text,
                match_score=app.match_score or 0,
            )

    return app


@router.post("/{app_id}/pitch", response_model=schemas.ApplicationResponse)
async def generate_application_pitch(
    app_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Generate an AI pitch AND a tailored resume for an application,
    both enhanced with Hindsight memory.

    Flow:
    1. Recall user preferences from Hindsight
    2. Optionally reflect for pitch-specific guidance
    3. Pass memory context to Groq for BOTH pitch and resume generation
    4. Store the generated pitch as cold_email + tailored_resume
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    resume = app.resume
    job = app.job
    if not resume or not job:
        raise HTTPException(status_code=400, detail="Incomplete data to generate pitch")

    # Determine user_id for Hindsight lookup
    user_id = resume.owner.id if resume.owner else 1

    # Step 1: Recall learned preferences from Hindsight (async)
    memory_context = await recall_preferences(user_id, context=f"writing pitch for {job.title} at {job.company}")

    # Step 2: Reflect for pitch-specific guidance (if memories exist) (async)
    reflection = ""
    if memory_context:
        reflection = await reflect_for_pitch(user_id, job.description or "", resume.raw_text or "")

    # Combine memory context and reflection
    full_context = ""
    if memory_context:
        full_context += f"LEARNED PREFERENCES:\n{memory_context}\n\n"
    if reflection:
        full_context += f"AGENT REFLECTION:\n{reflection}\n\n"

    # Step 3: Generate the pitch via Groq with memory context
    pitch_text = generate_pitch(
        resume.raw_text or "",
        job.description or "",
        memory_context=full_context if full_context else None,
    )

    # Step 4: Generate tailored resume via Groq with same memory context
    tailored_resume_md = generate_tailored_resume(
        resume.raw_text or "",
        job.description or "",
        memory_context=full_context if full_context else None,
    )

    # Step 5: Store both outputs
    app.cold_email = pitch_text
    app.cover_letter = pitch_text  # backward compat
    app.tailored_resume = tailored_resume_md
    app.pitch_version = (app.pitch_version or 0) + 1
    db.commit()
    db.refresh(app)

    return app


@router.put("/{app_id}/edit-pitch", response_model=schemas.ApplicationResponse)
async def save_edited_pitch(
    app_id: int,
    edit_request: schemas.PitchEditRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Save the user's edited pitch and trigger Hindsight learning.

    HINDSIGHT TRIGGER: Computes the diff between the AI-generated
    pitch and the user's edit, then retains the stylistic preference
    as a background task. This is the core learning loop.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    original_pitch = app.cold_email or app.cover_letter or ""
    edited_pitch = edit_request.edited_email

    # Save the edit
    app.edited_email = edited_pitch
    db.commit()
    db.refresh(app)

    # --- Hindsight Learning: retain the edit diff as a background task ---
    if original_pitch and edited_pitch and original_pitch.strip() != edited_pitch.strip():
        job = app.job
        job_title = job.title if job else f"Job #{app.job_id}"
        company = job.company if job else "Unknown"
        user_id = app.resume.owner.id if app.resume and app.resume.owner else 1

        background_tasks.add_task(
            retain_pitch_edit,
            user_id=user_id,
            original_pitch=original_pitch,
            edited_pitch=edited_pitch,
            job_title=job_title,
            company=company,
        )

    return app


@router.put("/{app_id}/edit-resume", response_model=schemas.ApplicationResponse)
async def save_edited_resume(
    app_id: int,
    edit_request: schemas.ResumeEditRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Save the user's edited tailored resume and trigger Hindsight learning.

    HINDSIGHT TRIGGER: Computes the diff between the AI-tailored resume
    and the user's edit, then retains the bullet-point phrasing preference
    as a background task. This teaches the agent how the user likes to
    describe their achievements (e.g., cost-saving vs latency metrics).
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    original_resume = app.tailored_resume or ""
    edited_resume = edit_request.edited_resume

    # Save the edit
    app.edited_resume = edited_resume
    db.commit()
    db.refresh(app)

    # --- Hindsight Learning: retain the resume edit diff as a background task ---
    if original_resume and edited_resume and original_resume.strip() != edited_resume.strip():
        job = app.job
        job_title = job.title if job else f"Job #{app.job_id}"
        company = job.company if job else "Unknown"
        user_id = app.resume.owner.id if app.resume and app.resume.owner else 1

        background_tasks.add_task(
            retain_resume_edit,
            user_id=user_id,
            original_resume=original_resume,
            edited_resume=edited_resume,
            job_title=job_title,
            company=company,
        )

    return app
