"""Regras de visibilidade das skills e carregamento para o chat."""
from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import Select, and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group import user_groups
from app.models.skill import Skill, skill_groups
from app.models.user import User

# Teto de skills no catálogo do Modo Agente (cada uma ocupa nome+descrição no prompt).
MAX_CATALOG_SKILLS = 30
# Máximo de skills ativadas explicitamente numa mensagem.
MAX_EXPLICIT_SKILLS = 3


def visible_condition(user: User):
    """Skill visível ao usuário: dele, global, ou compartilhada com um grupo seu."""
    my_groups = select(user_groups.c.group_id).where(user_groups.c.user_id == user.id)
    shared_with_me = select(skill_groups.c.skill_id).where(skill_groups.c.group_id.in_(my_groups))
    return or_(
        Skill.created_by == user.id,
        Skill.scope == "global",
        and_(Skill.scope == "group", Skill.id.in_(shared_with_me)),
    )


def with_relations(query: Select) -> Select:
    return query.options(
        selectinload(Skill.owner),
        selectinload(Skill.groups),
        selectinload(Skill.scripts),
    )


def can_edit(skill: Skill, user: User) -> bool:
    return user.role == "admin" or skill.created_by == user.id


@dataclass
class LoadedScript:
    filename: str
    content: str
    approved: bool


@dataclass
class LoadedSkill:
    """Cópia desacoplada da sessão do banco — usada pelas tools do agente."""

    id: int
    name: str
    title: str
    description: str
    instructions: str
    scripts: dict[str, LoadedScript] = field(default_factory=dict)


def _detach(skill: Skill) -> LoadedSkill:
    return LoadedSkill(
        id=skill.id,
        name=skill.name,
        title=skill.title,
        description=skill.description,
        instructions=skill.instructions,
        scripts={
            s.filename: LoadedScript(filename=s.filename, content=s.content, approved=s.approved)
            for s in skill.scripts
        },
    )


async def load_catalog(user: User, db: AsyncSession) -> list[LoadedSkill]:
    """Skills ativas visíveis ao usuário, para o catálogo do Modo Agente."""
    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.scripts))
        .where(visible_condition(user), Skill.is_active == True)
        .order_by(Skill.updated_at.desc())
        .limit(MAX_CATALOG_SKILLS)
    )
    return [_detach(s) for s in result.scalars().all()]


async def load_selected(user: User, skill_ids: list[int], db: AsyncSession) -> list[LoadedSkill]:
    """Skills escolhidas explicitamente pelo usuário (seletor ou /atalho)."""
    ids = list(dict.fromkeys(skill_ids))[:MAX_EXPLICIT_SKILLS]
    if not ids:
        return []
    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.scripts))
        .where(Skill.id.in_(ids), visible_condition(user))
    )
    found = {s.id: s for s in result.scalars().all()}
    return [_detach(found[i]) for i in ids if i in found]


def explicit_instructions_block(skills: list[LoadedSkill], agent_mode: bool) -> str:
    """Bloco de instruções injetado no prompt quando o usuário ativa skills."""
    if not skills:
        return ""
    parts = ["\n\n# Skills ativadas pelo usuário — siga estas instruções nesta resposta"]
    for s in skills:
        parts.append(f"\n## Skill: {s.title} (`{s.name}`)\n{s.instructions.strip()}")
        if s.scripts:
            names = ", ".join(s.scripts)
            if agent_mode:
                parts.append(
                    f"\nScripts disponíveis nesta skill: {names}. Execute-os com a ferramenta "
                    f"get_skill_script(skill_name=\"{s.name}\", script_path=..., execute=True, args=[...])."
                )
            else:
                parts.append(
                    f"\nObservação: esta skill tem scripts ({names}), mas a execução de scripts só "
                    "está disponível no Modo Agente. Informe isso ao usuário se o script for necessário."
                )
    return "\n".join(parts)
