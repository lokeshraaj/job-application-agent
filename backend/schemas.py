from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ---- USER SCHEMAS ----
class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- RESUME SCHEMAS ----
class ResumeBase(BaseModel):
    filename: str

class ResumeCreate(ResumeBase):
    user_id: int
    raw_text: Optional[str] = None
    optimized_text: Optional[str] = None

class ResumeResponse(ResumeBase):
    id: int
    user_id: int
    raw_text: Optional[str] = None
    optimized_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ---- JOB LISTING SCHEMAS ----
class JobListingBase(BaseModel):
    title: str
    company: str
    description: str
    required_skills: str

class JobListingCreate(JobListingBase):
    pass

class JobListingResponse(JobListingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- APPLICATION SCHEMAS ----
class ApplicationBase(BaseModel):
    resume_id: int
    job_id: int
    status: Optional[str] = "Pending"
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationResponse(ApplicationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
