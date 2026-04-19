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
    salary_range: Optional[str] = None
    seniority_level: Optional[str] = None
    location: Optional[str] = "Remote"

class JobListingResponse(JobListingBase):
    id: int
    salary_range: Optional[str] = None
    seniority_level: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ---- APPLICATION SCHEMAS ----
class ApplicationBase(BaseModel):
    resume_id: int
    job_id: int
    kanban_column: Optional[str] = "Applied"
    status: Optional[str] = "Applied"
    match_score: Optional[float] = None
    cold_email: Optional[str] = None
    edited_email: Optional[str] = None
    cover_letter: Optional[str] = None
    pitch_version: Optional[int] = 1
    tailored_resume: Optional[str] = None
    edited_resume: Optional[str] = None

class ApplicationCreate(BaseModel):
    resume_id: int
    job_id: int

class ApplicationResponse(ApplicationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---- PITCH EDIT (Hindsight learning trigger) ----
class PitchEditRequest(BaseModel):
    """Sent when a user edits an AI-generated pitch. Triggers Hindsight retain."""
    edited_email: str

# ---- RESUME EDIT (Hindsight learning trigger for tailored resume) ----
class ResumeEditRequest(BaseModel):
    """Sent when a user edits an AI-tailored resume. Triggers Hindsight retain."""
    edited_resume: str

# ---- KANBAN STATUS UPDATE ----
class KanbanStatusUpdate(BaseModel):
    """Sent when a user drags a card to a new Kanban column."""
    kanban_column: str

# ---- HINDSIGHT MEMORY LOG (for Agent Memory Log panel) ----
class MemoryLogItem(BaseModel):
    """Single entry in the Agent Memory Log UI panel."""
    id: str
    type: str           # "world" | "experience" | "observation" | "opinion"
    text: str
    created_at: str
    trend: Optional[str] = "stable"       # "stable" | "strengthening" | "weakening" | "stale"
    proof_count: Optional[int] = 1

class MemoryLogResponse(BaseModel):
    """Response wrapper for the memory log endpoint."""
    memories: List[MemoryLogItem]
    total: int

# ---- HINDSIGHT PREFERENCES (recall results) ----
class HindsightPreferences(BaseModel):
    """Recalled user preferences from Hindsight memory."""
    user_id: int
    preferences: str            # Formatted string of learned preferences
    memory_count: int           # Total memories in the user's bank
