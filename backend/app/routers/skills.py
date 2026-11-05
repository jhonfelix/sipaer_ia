"""Skills — pacotes de instruções (e scripts) reutilizáveis no chat.

Qualquer usuário cria skills. Visibilidade: pessoal, por grupo ou global (só
admin). Scripts só executam depois de aprovados por um admin; qualquer alteração
no conteúdo de um script volta a exigir aprovação.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.group import Group, user_groups
from app.models.skill import Skill, SkillScript
from app.models.user import User
from app.schemas.skill import (
    ScriptApproval,
    ScriptRunRequest,
    ScriptRunResponse,
    SkillCreate,
    SkillGroupRef,
    SkillResponse,
    SkillScriptIn,
    SkillUpdate,
)
from app.services.skill_runner import run_script
from app.services.skill_service import can_edit, visible_condition, with_relations

router = APIRouter(prefix="/skills", tags=["skills"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_response(skill: Skill, user: User) -> SkillResponse:
    data = SkillResponse.model_validate(skill)
    data.can_edit = can_edit(skill, user)
    return data


async def _get_skill(skill_id: int, user: User, db: AsyncSession) -> Skill:
    # populate_existing: recarrega do banco mesmo se o objeto já estiver na sessão
    query = with_relations(select(Skill).where(Skill.id == skill_id)).execution_options(
        populate_existing=True
    )
    if user.role != "admin":
        query = query.where(visible_condition(user))
    skill = (await db.execute(query)).scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill não encontrada")
    return skill


async def _get_editable(skill_id: int, user: User, db: AsyncSession) -> Skill:
    skill = await _get_skill(skill_id, user, db)
    if not can_edit(skill, user):
        raise HTTPException(status_code=403, detail="Apenas o autor ou um administrador pode alterar esta skill")
    return skill


async def _name_taken(name: str, db: AsyncSession, exclude_id: int | None = None) -> bool:
    q = select(Skill.id).where(Skill.name == name)
    if exclude_id is not None:
        q = q.where(Skill.id != exclude_id)
    return (await db.execute(q)).first() is not None


async def _resolve_groups(scope: str, group_ids: list[int], user: User, db: AsyncSession) -> list[Group]:
    if scope != "group":
        return []
    ids = set(group_ids)
    if not ids:
        raise HTTPException(status_code=400, detail="Selecione ao menos um grupo para compartilhar a skill")
    query = select(Group).where(Group.id.in_(ids))
    if user.role != "admin":
        # Usuário comum só compartilha com grupos dos quais participa.
        query = query.where(
            Group.id.in_(select(user_groups.c.group_id).where(user_groups.c.user_id == user.id))
        )
    groups = list((await db.execute(query)).scalars().all())
    if len(groups) != len(ids):
        raise HTTPException(status_code=400, detail="Grupo inválido ou do qual você não participa")
    return groups


def _sync_scripts(skill: Skill, incoming: list[SkillScriptIn], user: User) -> None:
    """Substitui o conjunto de scripts. Conteúdo alterado perde a aprovação
    (exceto quando quem salva é admin, que aprova implicitamente)."""
    names = [s.filename for s in incoming]
    if len(names) != len(set(names)):
        raise HTTPException(status_code=400, detail="Há scripts com o mesmo nome de arquivo")

    is_admin = user.role == "admin"
    now = datetime.utcnow()
    existing = {s.filename: s for s in skill.scripts}
    result: list[SkillScript] = []
    for item in incoming:
        script = existing.get(item.filename)
        if script is None:
            script = SkillScript(filename=item.filename, content=item.content)
            script.approved = False
        elif script.content != item.content:
            script.content = item.content
            script.approved = False
        if is_admin and not script.approved:
            script.approved = True
            script.approved_by = user.id
            script.approved_at = now
        elif not script.approved:
            script.approved_by = None
            script.approved_at = None
        result.append(script)
    skill.scripts = result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[SkillResponse])
async def list_skills(
    all: bool = Query(False, description="Admin: listar todas as skills do sistema"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = with_relations(select(Skill)).order_by(Skill.title)
    list_all = all and user.role == "admin"
    if not list_all:
        query = query.where(visible_condition(user))
    skills = (await db.execute(query)).scalars().all()
    usable: set[int] | None = None
    if list_all:
        usable = set((await db.execute(select(Skill.id).where(visible_condition(user)))).scalars().all())
    out = []
    for s in skills:
        item = _to_response(s, user)
        item.can_use = usable is None or s.id in usable
        out.append(item)
    return out


@router.get("/share-groups", response_model=list[SkillGroupRef])
async def share_groups(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Grupos com os quais o usuário pode compartilhar skills."""
    query = select(Group).order_by(Group.name)
    if user.role != "admin":
        query = query.where(
            Group.id.in_(select(user_groups.c.group_id).where(user_groups.c.user_id == user.id))
        )
    return (await db.execute(query)).scalars().all()


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _to_response(await _get_skill(skill_id, user, db), user)


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    body: SkillCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if await _name_taken(body.name, db):
        raise HTTPException(status_code=400, detail="Já existe uma skill com esse identificador")
    if body.scope == "global" and user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar skills globais")
    skill = Skill(
        name=body.name,
        title=body.title.strip(),
        description=body.description.strip(),
        instructions=body.instructions.strip(),
        scope=body.scope,
        is_active=body.is_active,
        created_by=user.id,
    )
    skill.groups = await _resolve_groups(body.scope, body.group_ids, user, db)
    skill.scripts = []
    _sync_scripts(skill, body.scripts, user)
    db.add(skill)
    await db.commit()
    return _to_response(await _get_skill(skill.id, user, db), user)


@router.patch("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: int,
    body: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    skill = await _get_editable(skill_id, user, db)

    if body.name is not None and body.name != skill.name:
        if await _name_taken(body.name, db, exclude_id=skill.id):
            raise HTTPException(status_code=400, detail="Já existe uma skill com esse identificador")
        skill.name = body.name
    if body.title is not None:
        skill.title = body.title.strip()
    if body.description is not None:
        skill.description = body.description.strip()
    if body.instructions is not None:
        skill.instructions = body.instructions.strip()
    if body.is_active is not None:
        skill.is_active = body.is_active
    if body.scope is not None or body.group_ids is not None:
        scope = body.scope or skill.scope
        # Tornar global exige admin; manter uma skill que já é global é permitido ao autor.
        if scope == "global" and skill.scope != "global" and user.role != "admin":
            raise HTTPException(status_code=403, detail="Apenas administradores podem criar skills globais")
        group_ids = body.group_ids if body.group_ids is not None else [g.id for g in skill.groups]
        skill.groups = await _resolve_groups(scope, group_ids, user, db)
        skill.scope = scope
    if body.scripts is not None:
        _sync_scripts(skill, body.scripts, user)

    await db.commit()
    return _to_response(await _get_skill(skill_id, user, db), user)


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    skill = await _get_editable(skill_id, user, db)
    await db.delete(skill)
    await db.commit()


@router.post("/{skill_id}/scripts/{script_id}/approval", response_model=SkillResponse)
async def set_script_approval(
    skill_id: int,
    script_id: int,
    body: ScriptApproval,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores aprovam scripts")
    skill = await _get_skill(skill_id, user, db)
    script = next((s for s in skill.scripts if s.id == script_id), None)
    if script is None:
        raise HTTPException(status_code=404, detail="Script não encontrado")
    script.approved = body.approved
    script.approved_by = user.id if body.approved else None
    script.approved_at = datetime.utcnow() if body.approved else None
    await db.commit()
    return _to_response(await _get_skill(skill_id, user, db), user)


@router.post("/{skill_id}/scripts/{script_id}/run", response_model=ScriptRunResponse)
async def test_run_script(
    skill_id: int,
    script_id: int,
    body: ScriptRunRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Execução de teste pela tela da skill (autor ou admin; script aprovado)."""
    skill = await _get_editable(skill_id, user, db)
    script = next((s for s in skill.scripts if s.id == script_id), None)
    if script is None:
        raise HTTPException(status_code=404, detail="Script não encontrado")
    if not script.approved:
        raise HTTPException(status_code=400, detail="Script aguardando aprovação de um administrador")
    return ScriptRunResponse(**await run_script(script.filename, script.content, body.args))
