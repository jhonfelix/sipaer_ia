"""add category to conversations

Revision ID: 007
Revises: 006
Create Date: 2026-06-22 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("category", sa.String(50), nullable=True, server_default="general"),
    )


def downgrade() -> None:
    op.drop_column("conversations", "category")
