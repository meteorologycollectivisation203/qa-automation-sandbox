import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.post("/image")
async def upload_image(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequestException("Only JPEG, PNG, GIF, WebP images are allowed")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise BadRequestException("File size exceeds 5MB limit")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"images/{uuid.uuid4()}.{ext}"
    filepath = Path(settings.UPLOAD_DIR) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_bytes(content)

    return {"url": f"/uploads/{filename}"}
