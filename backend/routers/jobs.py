from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)

@router.get("", response_model=List[schemas.JobListingResponse])
def get_jobs(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Fetch jobs. Returns mock jobs if none exist."""
    jobs = db.query(models.JobListing).offset(skip).limit(limit).all()
    if not jobs:
        mock_jobs = [
            models.JobListing(
                title="Frontend Developer",
                company="Tech Innovators",
                description="Looking for a skilled frontend developer proficient in React and Next.js. You will build user-facing features and ensure top-notch performance.",
                required_skills="React, Next.js, TypeScript, TailwindCSS"
            ),
            models.JobListing(
                title="Backend Engineer",
                company="Data Systems Tech",
                description="Join our team to build scalable and robust backend systems using Python, FastAPI, and PostgreSQL. Focus on API design and database optimization.",
                required_skills="Python, FastAPI, PostgreSQL, API Design"
            ),
            models.JobListing(
                title="Full Stack Engineer",
                company="Startup Inc.",
                description="We are a fast-paced startup looking for a full stack engineer. You'll work across the stack to deliver new features quickly and efficiently.",
                required_skills="JavaScript, React, Node.js, Express, MongoDB"
            ),
            models.JobListing(
                title="AI/ML Engineer",
                company="FutureAI Co.",
                description="Help us bring AI models to production. Experience with LLMs, PyTorch, and model deployment is required.",
                required_skills="Python, PyTorch, LLMs, Machine Learning"
            )
        ]
        db.add_all(mock_jobs)
        db.commit()
        jobs = db.query(models.JobListing).offset(skip).limit(limit).all()
    return jobs

@router.post("", response_model=schemas.JobListingResponse)
def create_job(job: schemas.JobListingCreate, db: Session = Depends(get_db)):
    db_job = models.JobListing(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/{job_id}", response_model=schemas.JobListingResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
