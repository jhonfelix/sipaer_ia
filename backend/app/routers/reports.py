from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.report import ReportCreate, ReportResponse, ReportUpdate
from app.services import report_service
from app.services.report_generation_service import generate_report_sections

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.list_reports(current_user.id, db)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await report_service.get_report(report_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await report_service.create_report(body, current_user.id, db)
    background_tasks.add_task(generate_report_sections, report.id, body.occurrence)
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    body: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await report_service.update_report(report_id, body, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await report_service.delete_report(report_id, current_user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
