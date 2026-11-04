"""Gestão de usuários e grupos — restrito a administradores."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.group import Group
from app.models.user import User
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    GroupCreate,
    GroupResponse,
    GroupUpdate,
)
from app.services.auth_service import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente. Apenas administradores podem gerenciar usuários e grupos.",
        )
    return current_user


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user(user_id: int, db: AsyncSession) -> User:
    user = await db.get(User, user_id, options=[selectinload(User.groups)])
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


async def _get_group(group_id: int, db: AsyncSession) -> Group:
    group = await db.get(Group, group_id, options=[selectinload(Group.members)])
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    return group


async def _load_groups(ids: list[int], db: AsyncSession) -> list[Group]:
    unique = set(ids)
    if not unique:
        return []
    result = await db.execute(select(Group).where(Group.id.in_(unique)))
    groups = list(result.scalars().all())
    if len(groups) != len(unique):
        raise HTTPException(status_code=400, detail="Um ou mais grupos informados não existem")
    return groups


async def _load_users(ids: list[int], db: AsyncSession) -> list[User]:
    unique = set(ids)
    if not unique:
        return []
    result = await db.execute(select(User).where(User.id.in_(unique)))
    users = list(result.scalars().all())
    if len(users) != len(unique):
        raise HTTPException(status_code=400, detail="Um ou mais usuários informados não existem")
    return users


async def _email_taken(email: str, db: AsyncSession, exclude_id: int | None = None) -> bool:
    q = select(User.id).where(User.email == email)
    if exclude_id is not None:
        q = q.where(User.id != exclude_id)
    return (await db.execute(q)).first() is not None


async def _group_name_taken(name: str, db: AsyncSession, exclude_id: int | None = None) -> bool:
    q = select(Group.id).where(func.lower(Group.name) == name.lower())
    if exclude_id is not None:
        q = q.where(Group.id != exclude_id)
    return (await db.execute(q)).first() is not None


async def _active_admin_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.role == "admin", User.is_active == True)
    )
    return int(result.scalar_one())


# ── Usuários ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(
        select(User).options(selectinload(User.groups)).order_by(User.name)
    )
    return result.scalars().all()


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if await _email_taken(body.email, db):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = User(
        name=body.name.strip(),
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        unit=body.unit.strip(),
        posto_graduacao=(body.posto_graduacao or "").strip() or None,
        is_active=body.is_active,
    )
    user.groups = await _load_groups(body.group_ids, db)
    db.add(user)
    await db.commit()
    await db.refresh(user, attribute_names=["groups", "created_at"])
    return user


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = await _get_user(user_id, db)

    # Impede que o sistema fique sem administrador ativo
    losing_admin = user.role == "admin" and user.is_active and (
        (body.role is not None and body.role != "admin") or body.is_active is False
    )
    if losing_admin:
        if user.id == admin.id:
            raise HTTPException(
                status_code=400,
                detail="Você não pode remover seu próprio acesso de administrador",
            )
        if await _active_admin_count(db) <= 1:
            raise HTTPException(
                status_code=400, detail="O sistema precisa de ao menos um administrador ativo"
            )

    if body.email is not None and body.email != user.email:
        if await _email_taken(body.email, db, exclude_id=user.id):
            raise HTTPException(status_code=400, detail="E-mail já está em uso por outro usuário")
        user.email = body.email
    if body.name is not None:
        user.name = body.name.strip()
    if body.unit is not None:
        user.unit = body.unit.strip()
    if body.posto_graduacao is not None:
        user.posto_graduacao = body.posto_graduacao.strip() or None
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = hash_password(body.password)
    if body.group_ids is not None:
        user.groups = await _load_groups(body.group_ids, db)

    await db.commit()
    await db.refresh(user)
    await db.refresh(user, attribute_names=["groups"])
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Desativa o usuário (soft delete) — preserva relatórios e histórico vinculados."""
    user = await _get_user(user_id, db)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar a própria conta")
    if user.role == "admin" and user.is_active and await _active_admin_count(db) <= 1:
        raise HTTPException(
            status_code=400, detail="O sistema precisa de ao menos um administrador ativo"
        )
    user.is_active = False
    await db.commit()


# ── Grupos ────────────────────────────────────────────────────────────────────

@router.get("/groups", response_model=list[GroupResponse])
async def list_groups(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).order_by(Group.name)
    )
    return result.scalars().all()


@router.post("/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    name = body.name.strip()
    if await _group_name_taken(name, db):
        raise HTTPException(status_code=400, detail="Já existe um grupo com esse nome")
    group = Group(name=name, description=(body.description or "").strip() or None)
    group.members = await _load_users(body.member_ids, db)
    db.add(group)
    await db.commit()
    await db.refresh(group, attribute_names=["members", "created_at"])
    return group


@router.patch("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    group = await _get_group(group_id, db)
    if body.name is not None:
        name = body.name.strip()
        if await _group_name_taken(name, db, exclude_id=group.id):
            raise HTTPException(status_code=400, detail="Já existe um grupo com esse nome")
        group.name = name
    if body.description is not None:
        group.description = body.description.strip() or None
    if body.member_ids is not None:
        group.members = await _load_users(body.member_ids, db)
    await db.commit()
    await db.refresh(group)
    await db.refresh(group, attribute_names=["members"])
    return group


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    group = await _get_group(group_id, db)
    await db.delete(group)
    await db.commit()
