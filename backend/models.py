from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    resumes = relationship("Resume", back_populates="owner")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    raw_text = Column(Text, nullable=True) # Used to store the parsed PDF output
    optimized_text = Column(Text, nullable=True) # Used to store the Groq rewritten text
    created_at = Column(DateTime, default=func.now())

    owner = relationship("User", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")


class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    description = Column(Text)
    required_skills = Column(Text)  # Comma separated or JSON string
    salary_range = Column(String, nullable=True)       # e.g. "$280K–$350K"
    seniority_level = Column(String, nullable=True)     # e.g. "Staff", "Principal", "Senior"
    location = Column(String, default="Remote")
    created_at = Column(DateTime, default=func.now())

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_id = Column(Integer, ForeignKey("job_listings.id"))

    # Kanban column — the visual state on the drag-and-drop board
    kanban_column = Column(String, default="Applied")
    # Legacy alias kept for backward compat
    status = Column(String, default="Applied")

    match_score = Column(Float, nullable=True)

    # Pitch / cold-email workflow
    cold_email = Column(Text, nullable=True)        # AI-generated pitch
    edited_email = Column(Text, nullable=True)       # User's edited version
    cover_letter = Column(Text, nullable=True)       # Legacy alias (same as cold_email)
    pitch_version = Column(Integer, default=1)       # Tracks regeneration count with memory

    # Tailored resume workflow (Memory-Driven Resume Tailoring)
    tailored_resume = Column(Text, nullable=True)    # AI-generated JD-tailored resume (markdown)
    edited_resume = Column(Text, nullable=True)      # User's edited version (triggers Hindsight learning)

    created_at = Column(DateTime, default=func.now())

    resume = relationship("Resume", back_populates="applications")
    job = relationship("JobListing", back_populates="applications")
