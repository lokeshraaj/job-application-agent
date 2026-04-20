import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routers import resumes, jobs, apply, activity

# Create the database tables
Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI(
    title="AI Job Agent API",
    description="Backend for the AI Job Agent full-stack application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Job Agent API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Include routers
from routers import auth
app.include_router(auth.router, prefix="/api/auth")

app.include_router(resumes.router, prefix="/api/resumes")
app.include_router(jobs.router, prefix="/api")
app.include_router(apply.router, prefix="/api")
app.include_router(activity.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, timeout_keep_alive=65)

