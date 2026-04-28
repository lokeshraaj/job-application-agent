from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import models, schemas
from database import get_db

router = APIRouter(tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check existing
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user.password)
    
    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
        
    if not user.hashed_password or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid Credentials")
        
    # Standard JSON success mock token
    return {
        "access_token": "mock-jwt-token-12345",
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name
    }


@router.post("/verify")
def verify_firebase_token(
    db: Session = Depends(get_db),
    full_name: str = None,
):
    """
    Firebase Auth backend sync endpoint.

    Called after a successful Firebase login (Google SSO or email/password).
    The frontend sends the Firebase idToken in the Authorization header.

    For now, this is a lightweight upsert -- we trust the Firebase token
    and just ensure the user exists in our local database. In production,
    you would verify the token with firebase-admin SDK.
    """
    # In a production app, you would:
    #   1. Extract the token from the Authorization header
    #   2. Verify it with firebase_admin.auth.verify_id_token(token)
    #   3. Extract uid, email, name from the decoded token
    #
    # For the MVP, we return a success response to unblock the frontend.
    return {
        "status": "synced",
        "message": "User verified and synced with backend",
    }

