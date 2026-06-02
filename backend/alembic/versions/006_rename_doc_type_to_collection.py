"""rename doc_type to collection in knowledge_documents

Revision ID: 006
Revises: 005
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mapeamento dos valores antigos para os novos slugs de coleção
OLD_TO_NEW = {
    "regulation": "regulamentos",
    "manual":     "procedimentos",
    "procedure":  "procedimentos",
    "report":     "relatorios_finais",
    "other":      "outros",
}


def upgrade() -> None:
    op.alter_column(
        "knowledge_documents",
        "doc_type",
        new_column_name="collection",
        existing_type=sa.String(50),
        nullable=False,
    )

    conn = op.get_bind()
    for old_val, new_val in OLD_TO_NEW.items():
        conn.execute(
            sa.text(
                "UPDATE knowledge_documents SET collection = :new WHERE collection = :old"
            ),
            {"new": new_val, "old": old_val},
        )


def downgrade() -> None:
    conn = op.get_bind()
    NEW_TO_OLD = {v: k for k, v in OLD_TO_NEW.items()}
    for new_val, old_val in NEW_TO_OLD.items():
        conn.execute(
            sa.text(
                "UPDATE knowledge_documents SET collection = :old WHERE collection = :new"
            ),
            {"old": old_val, "new": new_val},
        )

    op.alter_column(
        "knowledge_documents",
        "collection",
        new_column_name="doc_type",
        existing_type=sa.String(50),
        nullable=False,
    )
