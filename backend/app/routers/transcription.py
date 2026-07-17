import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.transcription import TranscriptionResponse
from app.services import transcription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcription", tags=["transcription"])

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/flac",
    "audio/webm",
}

MAX_SIZE_MB = 300


@router.post("", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcreve um áudio (Whisper) e analisa o diálogo com um LLM.

    Devolve a transcrição completa mais a inferência de falantes/papéis, resumo,
    fatos-chave, terminologia e marcadores de stress.
    """
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de áudio não suportado: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo excede o limite de {MAX_SIZE_MB}MB",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio"
        )

    try:
        return await transcription_service.analyze(
            content,
            file.filename or "audio",
            file.content_type,
        )
    except Exception:
        logger.exception("Falha na transcrição/análise do áudio")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Serviço de transcrição temporariamente indisponível.",
        )
