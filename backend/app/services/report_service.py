from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.report import Report, ReportSection, ReportSubsection
from app.schemas.report import ReportCreate, ReportUpdate


async def list_reports(user_id: int, db: AsyncSession) -> list[Report]:
    result = await db.execute(
        select(Report)
        .where(Report.created_by == user_id)
        .options(
            selectinload(Report.sections).selectinload(ReportSection.subsections)
        )
        .order_by(Report.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_report(report_id: int, user_id: int, db: AsyncSession) -> Report:
    result = await db.execute(
        select(Report)
        .where(Report.id == report_id, Report.created_by == user_id)
        .options(
            selectinload(Report.sections).selectinload(ReportSection.subsections)
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise ValueError("Relatório não encontrado")
    return report


async def create_report(data: ReportCreate, user_id: int, db: AsyncSession) -> Report:
    report = Report(
        occurrence=data.occurrence,
        created_by=user_id,
        last_edited_by=user_id,
        generation_status="pending",
    )
    db.add(report)
    await db.flush()

    for sec_data in data.sections:
        section = ReportSection(
            id=sec_data["id"],
            report_id=report.id,
            title=sec_data["title"],
            order=sec_data["order"],
            content=sec_data.get("content", ""),
            is_completed=sec_data.get("isCompleted", False),
        )
        db.add(section)
        for sub_data in sec_data.get("subsections", []):
            subsection = ReportSubsection(
                id=sub_data["id"],
                section_id=section.id,
                title=sub_data["title"],
                order=sub_data["order"],
                content=sub_data.get("content", ""),
                is_completed=sub_data.get("isCompleted", False),
            )
            db.add(subsection)

    await db.commit()

    result = await db.execute(
        select(Report)
        .where(Report.id == report.id)
        .options(selectinload(Report.sections).selectinload(ReportSection.subsections))
    )
    return result.scalar_one()


async def update_report(
    report_id: int, data: ReportUpdate, user_id: int, db: AsyncSession
) -> Report:
    report = await get_report(report_id, user_id, db)

    if data.status is not None:
        report.status = data.status
    if data.occurrence is not None:
        report.occurrence = data.occurrence
    report.last_edited_by = user_id
    report.version += 1

    if data.sections:
        for section in report.sections:
            sec_update = data.sections.get(section.id)
            if not sec_update:
                continue
            if sec_update.content is not None:
                section.content = sec_update.content
            if sec_update.is_completed is not None:
                section.is_completed = sec_update.is_completed
            if sec_update.subsections:
                for sub in section.subsections:
                    sub_update = sec_update.subsections.get(sub.id)
                    if not sub_update:
                        continue
                    if sub_update.content is not None:
                        sub.content = sub_update.content
                    if sub_update.is_completed is not None:
                        sub.is_completed = sub_update.is_completed

    await db.commit()

    result = await db.execute(
        select(Report)
        .where(Report.id == report.id)
        .options(selectinload(Report.sections).selectinload(ReportSection.subsections))
    )
    return result.scalar_one()


async def delete_report(report_id: int, user_id: int, db: AsyncSession) -> None:
    report = await get_report(report_id, user_id, db)
    await db.delete(report)
    await db.commit()
