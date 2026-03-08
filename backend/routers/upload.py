"""
/api/upload/{agent_id} — upload knowledge files for an agent.
"""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from config import settings
from db.database import get_db
from db.models import Agent, KnowledgeFile
from schemas.agent import KnowledgeFileResponse
from services.gemini_extract import extract_text_from_file

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/markdown",
}


@router.post("/upload/{agent_id}", response_model=list[KnowledgeFileResponse])
async def upload_files(
    agent_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Upload knowledge files for an agent. Extracts text via Gemini."""

    # Validate agent exists
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    # Check file count limit
    existing_count = db.query(KnowledgeFile).filter(KnowledgeFile.agent_id == agent_id).count()
    if existing_count + len(files) > settings.MAX_FILES_PER_AGENT:
        raise HTTPException(400, f"Max {settings.MAX_FILES_PER_AGENT} files per agent")

    # Ensure upload dir exists
    agent_upload_dir = os.path.join(settings.UPLOAD_DIR, agent_id)
    os.makedirs(agent_upload_dir, exist_ok=True)

    results = []

    for file in files:
        # Validate mime type
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_MIME_TYPES:
            continue  # skip unsupported types silently for MVP

        # Validate size
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            continue  # skip oversized files

        # Save to disk
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename or "file")[1]
        filename_on_disk = f"{file_id}{ext}"
        file_path = os.path.join(agent_upload_dir, filename_on_disk)

        with open(file_path, "wb") as f:
            f.write(content)

        # Extract text via Gemini
        extracted_text = ""
        try:
            extracted_text = await extract_text_from_file(file_path, content_type)
        except Exception as e:
            print(f"Text extraction failed for {file.filename}: {e}")

        # Save record
        knowledge_file = KnowledgeFile(
            id=file_id,
            agent_id=agent_id,
            filename=file.filename or "unknown",
            file_path=file_path,
            mime_type=content_type,
            extracted_text=extracted_text,
        )
        db.add(knowledge_file)
        results.append(
            KnowledgeFileResponse(
                id=file_id,
                filename=file.filename or "unknown",
                mime_type=content_type,
            )
        )

    db.commit()
    return results
