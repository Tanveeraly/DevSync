"""GitHub OAuth account linking.

Revision ID: a4f0c1b2d3e4
Revises: 816576012475
Create Date: 2026-10-08 00:00:00.000000
"""

from collections.abc import Sequence

revision: str = "a4f0c1b2d3e4"
down_revision: str | None = "816576012475"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The initial migration already creates this index.
    pass


def downgrade() -> None:
    # The initial migration owns this index.
    pass
