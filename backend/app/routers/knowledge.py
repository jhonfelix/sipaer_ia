from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import KNOWLEDGE_COLLECTIONS, settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.knowledge import KnowledgeDocument
from app.models.user import User
from app.schemas.knowledge import KnowledgeDocumentResponse, KnowledgeTextCreate
from app.services.ingestion_service import (
    extract_text_from_docx,
    extract_text_from_pdf,
    ingest_document,
)
from app.services.vector_service import vector_service

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

UPLOAD_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

ALLOWED_ROLES = {"admin", "manager"}
VALID_COLLECTIONS = set(KNOWLEDGE_COLLECTIONS.keys())
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente. Apenas administradores e gestores podem gerenciar documentos.",
        )
    return current_user


def _validate_collection(collection: str) -> str:
    if collection not in VALID_COLLECTIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Coleção inválida. Use uma das: {', '.join(sorted(VALID_COLLECTIONS))}",
        )
    return collection


async def _extract_text(file: UploadFile, content: bytes) -> str:
    try:
        if file.content_type == "application/pdf":
            return extract_text_from_pdf(content)
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return extract_text_from_docx(content)
        else:
            return content.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Erro ao extrair texto de '{file.filename}': {exc}")


@router.get("", response_model=list[KnowledgeDocumentResponse])
async def list_documents(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/text", response_model=KnowledgeDocumentResponse, status_code=201)
async def add_text(
    body: KnowledgeTextCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    doc = KnowledgeDocument(
        title=body.title,
        source=body.source,
        collection=body.collection,
        status="pending",
        size_bytes=len(body.content.encode()),
        added_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(
        ingest_document, doc.id, body.title, body.source, body.content, body.collection
    )
    return doc


@router.post("/upload", response_model=KnowledgeDocumentResponse, status_code=201)
async def add_upload(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    source: str = Form(...),
    collection: str = Form(...),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    _validate_collection(collection)

    if file.content_type not in UPLOAD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Tipo não suportado. Use PDF, DOCX ou TXT.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo excede o limite de 50 MB.",
        )

    text = await _extract_text(file, content)

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="Nenhum texto extraível encontrado. O arquivo pode estar em formato de imagem (scan).",
        )

    doc = KnowledgeDocument(
        title=title,
        source=source,
        collection=collection,
        status="pending",
        original_name=file.filename,
        size_bytes=len(content),
        added_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(ingest_document, doc.id, title, source, text, collection)
    return doc


@router.post("/upload/batch", response_model=list[KnowledgeDocumentResponse], status_code=201)
async def add_upload_batch(
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
    collection: str = Form(...),
    source: str = Form(""),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    _validate_collection(collection)

    if not files:
        raise HTTPException(status_code=422, detail="Nenhum arquivo enviado.")
    if len(files) > 50:
        raise HTTPException(status_code=422, detail="Máximo de 50 arquivos por lote.")

    created: list[KnowledgeDocument] = []

    for file in files:
        if file.content_type not in UPLOAD_TYPES:
            continue  # pula silenciosamente tipos inválidos no lote

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            continue  # pula arquivos muito grandes no lote

        try:
            text = await _extract_text(file, content)
        except HTTPException:
            continue

        if not text.strip():
            continue

        filename_title = (file.filename or "").rsplit(".", 1)[0] or file.filename or "Documento"
        doc_source = source.strip() or filename_title

        doc = KnowledgeDocument(
            title=filename_title,
            source=doc_source,
            collection=collection,
            status="pending",
            original_name=file.filename,
            size_bytes=len(content),
            added_by=current_user.id,
        )
        db.add(doc)
        await db.flush()  # gera o ID sem fechar a transação

        background_tasks.add_task(
            ingest_document, doc.id, filename_title, doc_source, text, collection
        )
        created.append(doc)

    if not created:
        raise HTTPException(
            status_code=422,
            detail="Nenhum arquivo válido encontrado no lote. Verifique os tipos (PDF, DOCX, TXT) e tamanhos (máx. 50 MB).",
        )

    await db.commit()
    for doc in created:
        await db.refresh(doc)

    return created


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: int,
    _: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    qdrant_collection = KNOWLEDGE_COLLECTIONS.get(doc.collection, "sipaer_outros")
    try:
        await vector_service.delete_by_doc_id(doc_id, qdrant_collection)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()
