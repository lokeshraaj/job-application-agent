from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db
from services.ai_service import generate_match_score

router = APIRouter(
    prefix="/apply",
    tags=["apply"],
)

@router.post("", response_model=schemas.ApplicationResponse)
def apply_for_job(resume_id: int, job_id: int, db: Session = Depends(get_db)):
    # Verify both exist
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()
    
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or Job not found")
        
    # Generate mock logic match score if no real resume text is mapped
    analysis = generate_match_score(resume.raw_text or "", job.description or "")
    
    db_app = models.Application(
        resume_id=resume.id,
        job_id=job.id,
        status="Applied",
        match_score=analysis.get("ats_score", 0)
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("", response_model=List[schemas.ApplicationResponse])
def get_applications(db: Session = Depends(get_db)):
    return db.query(models.Application).all()

@router.patch("/{app_id}", response_model=schemas.ApplicationResponse)
def update_application_status(app_id: int, status: str, db: Session = Depends(get_db)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = status
    db.commit()
    db.refresh(app)
    return app

@router.post("/{app_id}/pitch", response_model=schemas.ApplicationResponse)
def generate_application_pitch(app_id: int, db: Session = Depends(get_db)):
    from services.ai_service import generate_pitch
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    resume = app.resume
    job = app.job
    if not resume or not job:
        raise HTTPException(status_code=400, detail="Incomplete data to generate pitch")
        
    pitch_text = generate_pitch(resume.raw_text or "", job.description or "")
    
    app.cover_letter = pitch_text
    db.commit()
    db.refresh(app)
    return app
