import io
import os
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import AppError
from app.core.logging import get_logger

logger = get_logger(__name__)

UPLOAD_DIR = Path("/app/uploads")

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf", "text/plain", "application/zip",
                     "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_ALL = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES

MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5 MB
MAX_FILE_SIZE  = 10 * 1024 * 1024  # 10 MB

MAX_IMAGE_DIMENSION = 512


def _ensure_dir(folder: str) -> Path:
    d = UPLOAD_DIR / folder
    d.mkdir(parents=True, exist_ok=True)
    return d


def _resize_image(data: bytes, max_px: int = MAX_IMAGE_DIMENSION) -> bytes:
    """Resize image so the longest edge ≤ max_px, convert to WebP."""
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA") else "RGB")
        img.thumbnail((max_px, max_px), Image.LANCZOS)
        buf = io.BytesIO()
        # Save as WebP for smaller file size
        img.save(buf, format="WEBP", quality=85, optimize=True)
        return buf.getvalue()
    except Exception as exc:
        logger.warning("Image resize failed, storing original", error=str(exc))
        return data


async def upload_file(
    file: UploadFile,
    folder: str,
    *,
    is_image: bool = False,
) -> tuple[str, str, int]:
    """
    Save an uploaded file to local disk.
    Returns (public_url, content_type, file_size).
    """
    content_type = file.content_type or "application/octet-stream"
    allowed = ALLOWED_IMAGE_TYPES if is_image else ALLOWED_ALL
    if content_type not in allowed:
        raise AppError(
            f"File type '{content_type}' is not allowed. "
            f"Allowed: {', '.join(sorted(allowed))}",
            status_code=415,
        )

    data = await file.read()
    max_size = MAX_IMAGE_SIZE if is_image else MAX_FILE_SIZE
    if len(data) > max_size:
        raise AppError(
            f"File too large. Max size: {max_size // (1024 * 1024)} MB",
            status_code=413,
        )

    if is_image:
        data = _resize_image(data)
        ext = "webp"
        content_type = "image/webp"
    else:
        original_name = file.filename or "file"
        ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "bin"

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    dest_dir = _ensure_dir(folder)
    dest_path = dest_dir / unique_name
    dest_path.write_bytes(data)

    public_url = f"/uploads/{folder}/{unique_name}"
    logger.info("File uploaded", url=public_url, size=len(data), folder=folder)
    return public_url, content_type, len(data)


def delete_file(url: str) -> None:
    """Delete a file given its public URL path."""
    if not url or not url.startswith("/uploads/"):
        return
    rel = url.removeprefix("/uploads/")
    path = UPLOAD_DIR / rel
    try:
        path.unlink(missing_ok=True)
        logger.info("File deleted", path=str(path))
    except Exception as exc:
        logger.warning("File delete failed", path=str(path), error=str(exc))
