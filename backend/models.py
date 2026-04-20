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
    required_skills = Column(Text) # Comma separated for now or JSON string
    created_at = Column(DateTime, default=func.now())

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_id = Column(Integer, ForeignKey("job_listings.id"))
    status = Column(String, default="Pending") # Applied / Pending / Rejected
    match_score = Column(Float, nullable=True)
    cover_letter = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    resume = relationship("Resume", back_populates="applications")
    job = relationship("JobListing", back_populates="applications")
