"""GitHub OAuth account linking.

Revision ID: a4f0c1b2d3e4
Revises: 816576012475
Create Date: 2026-10-08 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a4f0c1b2d3e4"
down_revision: Union[str, None] = "816576012475"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f("ix_users_github_id"), "users", ["github_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_github_id"), table_name="users")
