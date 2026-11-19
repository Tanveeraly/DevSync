"""Add project invitations and revoke auto-synced contributor access.

Revision ID: b7d5e8a12c43
Revises: a4f0c1b2d3e4
Create Date: 2026-11-17 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b7d5e8a12c43"
down_revision: str | None = "a4f0c1b2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "OWNER", "ADMIN", "MEMBER", name="member_role", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_project_invitations_email"),
        "project_invitations",
        ["email"],
        unique=False,
    )

    # Older versions treated GitHub contributors as project members. Revoke
    # access for synthetic accounts created by that flow without deleting history.
    op.execute(
        """
        DELETE FROM project_members
        USING users
        WHERE project_members.user_id = users.id
          AND users.email LIKE '%@users.noreply.github.com'
          AND users.hashed_password IS NULL
          AND users.github_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE users
        SET is_active = FALSE
        WHERE email LIKE '%@users.noreply.github.com'
          AND hashed_password IS NULL
          AND github_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_project_invitations_email"), table_name="project_invitations")
    op.drop_table("project_invitations")
