"""add session_id to conversations

Revision ID: 004
Revises: 003
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("session_id", sa.String(36), nullable=True))
    op.create_index(
        "ix_conversations_user_session",
        "conversations",
        ["user_id", "session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_conversations_user_session", table_name="conversations")
    op.drop_column("conversations", "session_id")
