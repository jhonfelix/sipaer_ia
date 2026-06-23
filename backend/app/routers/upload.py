import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.media_file import MediaFile
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

MEDIA_ROOT = Path("/app/media")

ALLOWED_TYPES: dict[str, str] = {
    # Imagens
    "image/jpeg": "images",
    "image/png": "images",
    "image/gif": "images",
    "image/webp": "images",
    "image/svg+xml": "images",
    # Documentos
    "application/pdf": "documents",
    "application/msword": "documents",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documents",
    "application/vnd.ms-excel": "documents",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documents",
    "text/plain": "documents",
    # Áudio
    "audio/mpeg": "audio",
    "audio/wav": "audio",
    "audio/ogg": "audio",
    "audio/mp4": "audio",
    "audio/flac": "audio",
}

MAX_SIZE_MB = 300


@router.post("")
async def upload_file(
    file: UploadFile,
    report_id: int | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de arquivo não permitido: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo excede o limite de {MAX_SIZE_MB}MB",
        )

    subfolder = ALLOWED_TYPES[file.content_type]
    ext = Path(file.filename or "file").suffix.lower() or ""
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = MEDIA_ROOT / subfolder / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)

    url = f"/media/{subfolder}/{filename}"

    record = MediaFile(
        url=url,
        original_name=file.filename or filename,
        subfolder=subfolder,
        mime_type=file.content_type,
        size_bytes=len(content),
        report_id=report_id,
        uploaded_by=current_user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return JSONResponse({
        "id": record.id,
        "url": url,
        "filename": file.filename,
        "size": len(content),
        "type": file.content_type,
        "subfolder": subfolder,
    })


@router.delete("/{subfolder}/{filename}")
async def delete_file(
    subfolder: str,
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    if subfolder not in {"images", "documents", "audio"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subpasta inválida")

    target = (MEDIA_ROOT / subfolder / filename).resolve()
    if not str(target).startswith(str(MEDIA_ROOT.resolve())):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caminho inválido")

    if not target.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")

    target.unlink()

    url = f"/media/{subfolder}/{filename}"
    result = await db.execute(select(MediaFile).where(MediaFile.url == url))
    record = result.scalar_one_or_none()
    if record:
        await db.delete(record)
        await db.commit()

    return JSONResponse({"deleted": url})
