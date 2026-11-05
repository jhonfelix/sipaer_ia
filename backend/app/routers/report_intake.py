"""Etapa "Documentos" do assistente de relatórios: upload, análise com IA e esquema do RAI.

Prefixo próprio (/report-intake) para não colidir com GET /reports/{report_id}.
A análise roda em segundo plano; o progresso e o resultado ficam no Redis por 2 h.
"""
import json
import logging
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import undefer

from app.database import AsyncSession, AsyncSessionLocal, get_db
from app.middleware.auth import get_current_user
from app.models.report import Report
from app.models.report_document import ReportDocument
from app.models.user import User
from app.services import document_text
from app.services.cache_service import cache_service
from app.services.rai_extraction_service import DocInput, analyze
from app.services.rai_schema import schema_payload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/report-intake", tags=["report-intake"])

JOB_TTL = 2 * 60 * 60
MAX_DOCS_PER_ANALYSIS = 20


class DocumentOut(BaseModel):
    id: int
    filename: str
    size_bytes: int
    chars: int
    pages: int | None


class AnalyzeRequest(BaseModel):
    document_ids: list[int] = Field(min_length=1, max_length=MAX_DOCS_PER_ANALYSIS)


def _job_key(job_id: str) -> str:
    return f"rai-job:{job_id}"


async def _save_job(job_id: str, data: dict) -> None:
    await cache_service.set(_job_key(job_id), json.dumps(data, ensure_ascii=False), ttl=JOB_TTL)


@router.get("/schema")
async def rai_schema(_: User = Depends(get_current_user)):
    return schema_payload()


@router.post("/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filename = (file.filename or "documento").strip()[:255]
    content = await file.read()
    try:
        extracted = document_text.extract(filename, content)
    except document_text.ExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    doc = ReportDocument(
        uploaded_by=user.id,
        filename=filename,
        size_bytes=len(content),
        chars=len(extracted.text),
        pages=extracted.pages,
        text=extracted.text,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc, attribute_names=["id"])
    return DocumentOut(id=doc.id, filename=doc.filename, size_bytes=doc.size_bytes, chars=doc.chars, pages=doc.pages)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await db.get(ReportDocument, document_id)
    if not doc or doc.uploaded_by != user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    if doc.report_id is not None:
        raise HTTPException(status_code=400, detail="Documento já vinculado a um relatório")
    await db.delete(doc)
    await db.commit()


@router.get("/reports/{report_id}/documents", response_model=list[DocumentOut])
async def list_report_documents(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = await db.get(Report, report_id)
    if not report or report.created_by != user.id:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    docs = (
        await db.execute(select(ReportDocument).where(ReportDocument.report_id == report_id).order_by(ReportDocument.id))
    ).scalars().all()
    return [DocumentOut(id=d.id, filename=d.filename, size_bytes=d.size_bytes, chars=d.chars, pages=d.pages) for d in docs]


@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ids = list(dict.fromkeys(body.document_ids))
    owned = (
        await db.execute(
            select(ReportDocument.id).where(
                ReportDocument.id.in_(ids),
                ReportDocument.uploaded_by == user.id,
            )
        )
    ).scalars().all()
    if len(owned) != len(ids):
        raise HTTPException(status_code=404, detail="Um ou mais documentos não foram encontrados")

    job_id = str(uuid4())
    await _save_job(job_id, {
        "status": "running", "userId": user.id, "done": 0, "total": 0,
        "current": "Preparando documentos", "result": None, "error": None,
    })
    background_tasks.add_task(_run_job, job_id, user.id, ids)
    return {"job_id": job_id}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: User = Depends(get_current_user)):
    raw = await cache_service.get(_job_key(job_id))
    if not raw:
        raise HTTPException(status_code=404, detail="Análise não encontrada ou expirada")
    data = json.loads(raw)
    if data.get("userId") != user.id:
        raise HTTPException(status_code=404, detail="Análise não encontrada ou expirada")
    data.pop("userId", None)
    return data


async def _run_job(job_id: str, user_id: int, ids: list[int]) -> None:
    state = {"status": "running", "userId": user_id, "done": 0, "total": 0,
             "current": "", "result": None, "error": None}
    try:
        async with AsyncSessionLocal() as db:
            docs = (
                await db.execute(
                    select(ReportDocument).options(undefer(ReportDocument.text)).where(ReportDocument.id.in_(ids))
                )
            ).scalars().all()
            inputs = [DocInput(d.id, d.filename, d.text) for d in docs]

        async def progress(done: int, total: int, label: str) -> None:
            state.update(done=done, total=total, current=label)
            await _save_job(job_id, state)

        state["result"] = await analyze(inputs, progress)
        state["status"] = "done"
    except Exception:
        logger.exception("Análise de documentos %s falhou", job_id)
        state["status"] = "error"
        state["error"] = "Falha na análise dos documentos. Verifique a conexão com o servidor de IA e tente novamente."
    await _save_job(job_id, state)
