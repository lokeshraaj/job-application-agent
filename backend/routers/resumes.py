"""
AutoApply AI -- Resume Router (Hindsight-Enhanced)
===================================================
Handles resume upload, PDF parsing, AI analysis via Groq,
and seeds the user's Hindsight memory bank with skill profile.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db
from utils.parser import parse_file
from services.ai_service import analyze_resume
from services.hindsight_service import retain_resume_profile, ensure_bank_exists

router = APIRouter(
    tags=["resumes"],
)


async def _seed_hindsight_from_resume(user_id: int, ai_analysis_json: str):
    """
    Background task (async): parse the AI analysis JSON and seed Hindsight
    with the user's skill profile and professional summary.
    """
    try:
        data = json.loads(ai_analysis_json)
        skills = data.get("skills", [])
        summary = data.get("professional_summary", "")
        experience_years = data.get("experience_years", 0)

        await ensure_bank_exists(user_id)
        await retain_resume_profile(
            user_id=user_id,
            skills=skills,
            summary=summary,
            experience_years=experience_years,
        )
    except Exception as e:
        # Background task -- log but don't crash
        import logging
        logging.getLogger(__name__).error("Hindsight resume seed failed: %s", e)


@router.post("/upload", response_model=schemas.ResumeResponse)
async def upload_resume(
    user_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Read bytes for parsing
    file_bytes = await file.read()

    # 2. Parse file
    try:
        parsed_text = parse_file(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Document Parsing Failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during parsing.")

    # 3. Call AI Service for JSON Analysis (Groq llama-3.3-70b-versatile)
    try:
        ai_analysis_json = analyze_resume(parsed_text)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI Integration Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during AI analysis.")

    # 4. Store in database
    db_resume = models.Resume(
        user_id=user_id,
        filename=file.filename,
        raw_text=parsed_text,
        optimized_text=ai_analysis_json
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    # 5. Seed Hindsight with resume profile (BACKGROUND -- non-blocking)
    #    _seed_hindsight_from_resume is async -- FastAPI will await it on the event loop.
    background_tasks.add_task(
        _seed_hindsight_from_resume,
        user_id=user_id,
        ai_analysis_json=ai_analysis_json,
    )

    return db_resume


@router.get("", response_model=List[schemas.ResumeResponse])
def get_resumes(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(models.Resume).offset(skip).limit(limit).all()


@router.get("/{resume_id}", response_model=schemas.ResumeResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume
