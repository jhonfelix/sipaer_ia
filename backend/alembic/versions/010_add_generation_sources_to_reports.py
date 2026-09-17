"""add generation_sources to reports

Revision ID: 010
Revises: 009
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import JSON

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "reports",
        sa.Column("generation_sources", JSON, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reports", "generation_sources")
