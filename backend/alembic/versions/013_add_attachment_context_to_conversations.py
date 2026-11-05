"""add attachment_context to conversations

Revision ID: 013
Revises: 012
Create Date: 2026-11-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import MEDIUMTEXT

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # MEDIUMTEXT: o /chat/extract devolve até 200 mil caracteres (TEXT = 64 KB).
    op.add_column("conversations", sa.Column("attachment_context", MEDIUMTEXT(), nullable=True))


def downgrade() -> None:
    op.drop_column("conversations", "attachment_context")
