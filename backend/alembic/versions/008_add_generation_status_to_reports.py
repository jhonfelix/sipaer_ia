"""add generation_status to reports

Revision ID: 008
Revises: 007
Create Date: 2026-06-22 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "reports",
        sa.Column("generation_status", sa.String(20), nullable=True),
    )
    op.add_column(
        "reports",
        sa.Column("generation_started_at", sa.DateTime, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reports", "generation_started_at")
    op.drop_column("reports", "generation_status")
