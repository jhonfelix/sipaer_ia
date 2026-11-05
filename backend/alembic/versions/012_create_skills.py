"""create skills, skill_groups and skill_scripts tables

Revision ID: 012
Revises: 011
Create Date: 2026-11-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.String(1024), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("scope", sa.String(20), nullable=False, server_default="personal"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_skills_name", "skills", ["name"], unique=True)

    op.create_table(
        "skill_groups",
        sa.Column(
            "skill_id", sa.Integer(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True,
        ),
        sa.Column(
            "group_id", sa.Integer(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True,
        ),
    )

    op.create_table(
        "skill_scripts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "skill_id", sa.Integer(),
            sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("filename", sa.String(100), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approved_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("skill_id", "filename", name="uq_skill_script_filename"),
    )


def downgrade() -> None:
    op.drop_table("skill_scripts")
    op.drop_table("skill_groups")
    op.drop_index("ix_skills_name", table_name="skills")
    op.drop_table("skills")
