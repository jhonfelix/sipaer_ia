from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def list_projects(
    user_id: int, db: AsyncSession, chat_type: str | None = None
) -> list[Project]:
    query = select(Project).where(Project.created_by == user_id)
    if chat_type is not None:
        query = query.where(Project.chat_type == chat_type)
    result = await db.execute(query.order_by(Project.updated_at.desc()))
    return list(result.scalars().all())


async def get_project(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.created_by == user_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise ValueError("Projeto não encontrado")
    return project


async def create_project(data: ProjectCreate, user_id: int, db: AsyncSession) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        color=data.color,
        icon=data.icon,
        instructions=data.instructions,
        chat_type=data.chat_type,
        created_by=user_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(
    project_id: int, data: ProjectUpdate, user_id: int, db: AsyncSession
) -> Project:
    project = await get_project(project_id, user_id, db)

    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(project_id: int, user_id: int, db: AsyncSession) -> None:
    project = await get_project(project_id, user_id, db)
    await db.delete(project)
    await db.commit()
