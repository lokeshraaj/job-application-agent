"""
AutoApply AI — Jobs Router
============================
Seeds the database with experienced-engineer-targeted job listings.
All roles target senior/staff/principal engineers at top-tier companies.
No student or entry-level positions.
"""

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
    """Fetch jobs. Seeds experienced-engineer roles if none exist."""
    jobs = db.query(models.JobListing).offset(skip).limit(limit).all()
    if not jobs:
        mock_jobs = [
            models.JobListing(
                title="Staff Frontend Engineer",
                company="Stripe",
                description=(
                    "Join Stripe's Developer Platform team to architect and build the "
                    "next generation of payment UI components used by millions of businesses. "
                    "You will lead the design system evolution, mentor a team of 5 senior "
                    "engineers, and drive performance optimizations that impact $1T+ in "
                    "annual payment volume. Deep expertise in React, TypeScript, and "
                    "micro-frontend architectures required. Experience with WebGL, Canvas "
                    "rendering, or real-time data visualization is a strong plus."
                ),
                required_skills="React, TypeScript, Design Systems, Performance Optimization, Micro-Frontends",
                salary_range="$280K – $350K",
                seniority_level="Staff",
                location="Remote (US)",
            ),
            models.JobListing(
                title="Principal Backend Engineer",
                company="Databricks",
                description=(
                    "Lead the architecture of Databricks' distributed query execution engine. "
                    "You will design systems handling petabyte-scale data processing, optimize "
                    "Spark execution plans, and define the technical roadmap for the runtime "
                    "team. This role requires 10+ years of experience in distributed systems, "
                    "strong Rust or Go proficiency, and deep knowledge of query optimization, "
                    "columnar storage formats (Parquet, Delta), and cluster orchestration. "
                    "Published research or patents in databases/systems is valued."
                ),
                required_skills="Distributed Systems, Rust, Go, Query Optimization, Apache Spark, Delta Lake",
                salary_range="$300K – $400K",
                seniority_level="Principal",
                location="San Francisco, CA (Hybrid)",
            ),
            models.JobListing(
                title="Senior AI Platform Engineer",
                company="Anthropic",
                description=(
                    "Build and scale the infrastructure powering Claude and future foundation "
                    "models. You'll work on training pipelines, inference optimization, and "
                    "model serving at scale. This role involves designing GPU cluster "
                    "scheduling systems, optimizing CUDA kernels, and building evaluation "
                    "frameworks for RLHF alignment. Requires 7+ years in ML infrastructure, "
                    "hands-on experience with PyTorch internals, and familiarity with "
                    "distributed training frameworks (DeepSpeed, Megatron-LM)."
                ),
                required_skills="Python, PyTorch, CUDA, Distributed Training, ML Infrastructure, Kubernetes",
                salary_range="$250K – $320K",
                seniority_level="Senior",
                location="San Francisco, CA",
            ),
            models.JobListing(
                title="Staff Full-Stack Engineer",
                company="Figma",
                description=(
                    "Own the end-to-end development of Figma's collaborative editing engine, "
                    "serving 4M+ daily active designers and developers. You'll architect "
                    "real-time CRDT synchronization, optimize WebAssembly rendering pipelines, "
                    "and build the API layer for Figma's plugin ecosystem. Requires deep "
                    "expertise in TypeScript, React, and WebGL, plus experience building "
                    "real-time collaborative systems at scale. Strong CS fundamentals in "
                    "data structures, algorithms, and networking protocols required."
                ),
                required_skills="TypeScript, React, WebGL, WebAssembly, CRDTs, Real-time Systems",
                salary_range="$270K – $340K",
                seniority_level="Staff",
                location="Remote (US/EU)",
            ),
            models.JobListing(
                title="Senior Platform Engineer",
                company="Vercel",
                description=(
                    "Shape the future of frontend deployment infrastructure. You'll work on "
                    "Vercel's edge runtime, serverless functions, and build system used by "
                    "Netflix, GitHub, and thousands of engineering teams. This role involves "
                    "designing and operating globally distributed CDN infrastructure, "
                    "optimizing cold start times, and building developer tooling for Next.js. "
                    "Requires expertise in Node.js, Rust, edge computing, and infrastructure "
                    "as code (Terraform/Pulumi). Experience with V8 isolates is a strong plus."
                ),
                required_skills="Node.js, Rust, Edge Computing, CDN Architecture, Terraform, Next.js",
                salary_range="$230K – $290K",
                seniority_level="Senior",
                location="Remote (Global)",
            ),
            models.JobListing(
                title="Staff Security Engineer",
                company="1Password",
                description=(
                    "Lead the security architecture for 1Password's core vault encryption "
                    "and zero-knowledge authentication system. You will design and implement "
                    "cryptographic protocols, conduct threat modeling for new features, and "
                    "build automated security testing pipelines. Requires 8+ years in "
                    "application security, deep knowledge of modern cryptography (AES-GCM, "
                    "SRP, Argon2), and experience with Rust or Go. Bug bounty or CVE "
                    "publication history is valued."
                ),
                required_skills="Cryptography, Rust, Go, Threat Modeling, Zero-Knowledge Proofs, AppSec",
                salary_range="$260K – $330K",
                seniority_level="Staff",
                location="Remote (US/Canada)",
            ),
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
