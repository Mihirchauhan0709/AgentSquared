"""
Auth dependency — extracts and validates JWT from Authorization header.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Company
from services.auth import decode_token

import jwt

security = HTTPBearer()


async def get_current_company(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Company:
    """FastAPI dependency — returns the authenticated Company or raises 401."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
        company_id = payload.get("sub")
        if not company_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=401, detail="Company not found")

    return company
