from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any
import datetime
from database import get_db
import models

router = APIRouter(
    prefix="/activity",
    tags=["activity"],
)

@router.get("")
def get_recent_activity(db: Session = Depends(get_db)):
    """Fetch recent activity from Resumes and Applications, returning top 5."""
    
    # 1. Fetch resumes
    resumes = db.query(models.Resume).order_by(desc(models.Resume.created_at)).limit(5).all()
    
    # 2. Fetch applications
    applications = db.query(models.Application).order_by(desc(models.Application.created_at)).limit(5).all()
    
    activities = []
    
    for r in resumes:
        activities.append({
            "id": r.id,
            "type": "resume",
            "tag": "Resume Scored",
            "name": r.filename,
            "status": "Scored",
            "created_at": r.created_at.isoformat() if r.created_at else ""
        })
        
    for a in applications:
        job = a.job
        job_title = job.title if job else f"Job #{a.job_id}"
        activities.append({
            "id": a.id,
            "type": "application",
            "tag": "Job Applied",
            "name": job_title,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else ""
        })
        
    # Sort by created_at descending
    activities.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Return top 5
    return activities[:5]
