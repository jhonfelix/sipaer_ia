from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select

from app.config import PROJECT_VECTOR_COLLECTION
from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation
from app.models.project import ProjectDocument
from app.models.user import User
from app.schemas.chat import ConversationSessionResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectDocumentResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.services import project_service
from app.services.ingestion_service import (
    extract_text_from_docx,
    extract_text_from_pdf,
    ingest_project_document,
)
from app.services.vector_service import vector_service

router = APIRouter(prefix="/projects", tags=["projects"])

UPLOAD_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_FILE_SIZE = 300 * 1024 * 1024  # 300 MB


async def _extract_text(file: UploadFile, content: bytes) -> str:
    try:
        if file.content_type == "application/pdf":
            return extract_text_from_pdf(content)
        elif (
            file.content_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            return extract_text_from_docx(content)
        else:
            return content.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Erro ao extrair texto de '{file.filename}': {exc}"
        )


# --------------------------------------------------------------------------- #
# CRUD de projetos
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    scope: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.list_projects(current_user.id, db, chat_type=scope)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await project_service.create_project(body, current_user.id, db)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await project_service.update_project(project_id, body, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    try:
        await vector_service.delete_by_project_id(project_id, PROJECT_VECTOR_COLLECTION)
    except Exception:
        pass

    await project_service.delete_project(project_id, current_user.id, db)


# --------------------------------------------------------------------------- #
# Arquivos do projeto
# --------------------------------------------------------------------------- #
@router.get("/{project_id}/documents", response_model=list[ProjectDocumentResponse])
async def list_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await db.execute(
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/{project_id}/documents/upload",
    response_model=list[ProjectDocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_documents(
    project_id: int,
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    if not files:
        raise HTTPException(status_code=422, detail="Nenhum arquivo enviado.")
    if len(files) > 50:
        raise HTTPException(status_code=422, detail="Máximo de 50 arquivos por lote.")

    created: list[ProjectDocument] = []

    for file in files:
        if file.content_type not in UPLOAD_TYPES:
            continue  # pula silenciosamente tipos inválidos

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            continue

        try:
            text = await _extract_text(file, content)
        except HTTPException:
            continue

        if not text.strip():
            continue

        title = (file.filename or "").rsplit(".", 1)[0] or file.filename or "Documento"

        doc = ProjectDocument(
            project_id=project_id,
            title=title,
            source=title,
            status="pending",
            original_name=file.filename,
            size_bytes=len(content),
            added_by=current_user.id,
        )
        db.add(doc)
        await db.flush()

        background_tasks.add_task(
            ingest_project_document, doc.id, project_id, title, title, text
        )
        created.append(doc)

    if not created:
        raise HTTPException(
            status_code=422,
            detail="Nenhum arquivo válido encontrado. Use PDF, DOCX ou TXT com texto extraível.",
        )

    await db.commit()
    for doc in created:
        await db.refresh(doc)

    return created


@router.delete(
    "/{project_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_document(
    project_id: int,
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await db.execute(
        select(ProjectDocument).where(
            ProjectDocument.id == doc_id, ProjectDocument.project_id == project_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    try:
        await vector_service.delete_by_doc_id(doc_id, PROJECT_VECTOR_COLLECTION)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()


# --------------------------------------------------------------------------- #
# Conversas do projeto (sessões agrupadas por session_id)
# --------------------------------------------------------------------------- #
@router.get("/{project_id}/sessions", response_model=list[ConversationSessionResponse])
async def project_sessions(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await project_service.get_project(project_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
            Conversation.project_id == project_id,
            Conversation.session_id.isnot(None),
        )
        .order_by(Conversation.session_id, Conversation.created_at)
    )
    rows = result.scalars().all()

    sessions_dict: dict[str, list[Conversation]] = {}
    for row in rows:
        sessions_dict.setdefault(row.session_id, []).append(row)  # type: ignore[index]

    out: list[ConversationSessionResponse] = []
    for sid, msgs in sessions_dict.items():
        first_user = next((m for m in msgs if m.role == "user"), None)
        last_msg = msgs[-1]
        raw_title = first_user.content if first_user else "Conversa"
        title = raw_title[:50] + ("…" if len(raw_title) > 50 else "")
        preview = last_msg.content[:60] + ("…" if len(last_msg.content) > 60 else "")
        category = (first_user.category or "general") if first_user else "general"
        out.append(
            ConversationSessionResponse(
                session_id=sid,
                title=title,
                preview=preview,
                message_count=len(msgs),
                updated_at=last_msg.created_at,
                category=category,
            )
        )

    out.sort(key=lambda s: s.updated_at, reverse=True)
    return out
