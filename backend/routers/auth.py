"""
/api/auth — signup, login, get current company.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Company
from services.auth import hash_password, verify_password, create_token
from dependencies.auth import get_current_company

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str
    company_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    company_id: str
    company_name: str


class CompanyResponse(BaseModel):
    id: str
    email: str
    company_name: str


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Create a new company account."""
    # Check if email already exists
    existing = db.query(Company).filter(Company.email == req.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    company = Company(
        id=str(uuid.uuid4()),
        email=req.email,
        password_hash=hash_password(req.password),
        company_name=req.company_name,
    )
    db.add(company)
    db.commit()

    token = create_token(company.id)
    return AuthResponse(
        token=token,
        company_id=company.id,
        company_name=company.company_name,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    company = db.query(Company).filter(Company.email == req.email).first()
    if not company or not verify_password(req.password, company.password_hash):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(company.id)
    return AuthResponse(
        token=token,
        company_id=company.id,
        company_name=company.company_name,
    )


@router.get("/me", response_model=CompanyResponse)
async def get_me(company: Company = Depends(get_current_company)):
    """Get the current authenticated company."""
    return CompanyResponse(
        id=company.id,
        email=company.email,
        company_name=company.company_name,
    )
