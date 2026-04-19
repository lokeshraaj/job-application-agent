"""
AutoApply AI -- FastAPI Application Entry Point
=================================================
Registers all routers including the new Hindsight memory router.
Initializes the database and (optionally) bootstraps a default
Hindsight memory bank on startup.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routers import resumes, jobs, apply, activity, auth, hindsight

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan: runs on startup/shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Create tables + initialize default Hindsight memory bank.
    Shutdown: (no-op for now)
    """
    # Create the database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")

    # Bootstrap Hindsight memory bank for default user (id=1)
    try:
        from services.hindsight_service import ensure_bank_exists
        bank_ready = await ensure_bank_exists(user_id=1)
        if bank_ready:
            logger.info("Hindsight memory bank ready for default user.")
        else:
            logger.warning("Hindsight memory bank could not be initialized -- check API key.")
    except Exception as e:
        logger.warning("Hindsight startup init skipped: %s", e)

    yield  # App is running

    logger.info("AutoApply AI shutting down.")


# ---------------------------------------------------------------------------
# App initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AutoApply AI API",
    description="Hindsight-powered AI career agent for experienced software engineers",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "ok", "message": "AutoApply AI API is running!", "version": "2.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "hindsight-cloud"}


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,       prefix="/api/auth")
app.include_router(resumes.router,    prefix="/api/resumes")
app.include_router(jobs.router,       prefix="/api")
app.include_router(apply.router,      prefix="/api")
app.include_router(activity.router,   prefix="/api")
app.include_router(hindsight.router,  prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, timeout_keep_alive=65)
