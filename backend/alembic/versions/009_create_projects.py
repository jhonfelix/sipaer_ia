"""create projects and project_documents tables, add project_id to conversations

Revision ID: 009
Revises: 008
Create Date: 2026-07-08 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("chat_type", sa.String(50), nullable=False, server_default="general"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_projects_created_by", "projects", ["created_by"])

    op.create_table(
        "project_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("original_name", sa.String(500), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_msg", sa.Text(), nullable=True),
        sa.Column("added_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_documents_project_id", "project_documents", ["project_id"])

    op.add_column(
        "conversations",
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_conversations_project_id", "conversations", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_conversations_project_id", table_name="conversations")
    op.drop_column("conversations", "project_id")
    op.drop_index("ix_project_documents_project_id", table_name="project_documents")
    op.drop_table("project_documents")
    op.drop_index("ix_projects_created_by", table_name="projects")
    op.drop_table("projects")
