"""Add project-scoped pull request queue data.

Revision ID: c3e6f4a91b20
Revises: b7d5e8a12c43
Create Date: 2026-11-17 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "c3e6f4a91b20"
down_revision: str | None = "b7d5e8a12c43"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint("uq_issues_project_id_id", "issues", ["project_id", "id"])
    op.create_table(
        "pull_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("github_number", sa.Integer(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("head_branch", sa.String(length=255), nullable=True),
        sa.Column("state", sa.String(length=20), server_default="open", nullable=False),
        sa.Column("is_draft", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("check_summary", sa.String(length=50), nullable=True),
        sa.Column("review_summary", sa.String(length=50), nullable=True),
        sa.Column("github_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("merged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("queue_position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "github_number", name="uq_pull_request_project_number"),
        sa.UniqueConstraint("project_id", "id", name="uq_pull_request_project_id_id"),
    )
    op.create_index(
        "ix_pull_requests_project_queue",
        "pull_requests",
        ["project_id", "queue_position", "github_number"],
    )

    op.create_table(
        "pull_request_dependencies",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pull_request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blocked_by_pull_request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "pull_request_id != blocked_by_pull_request_id",
            name="ck_pr_dependency_not_self",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "blocked_by_pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_dependency_blocked_by",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_dependency_pull_request",
        ),
        sa.PrimaryKeyConstraint("project_id", "pull_request_id", "blocked_by_pull_request_id"),
    )
    op.create_index(
        "ix_pr_dependencies_blocked_by",
        "pull_request_dependencies",
        ["project_id", "blocked_by_pull_request_id"],
    )

    op.create_table(
        "pull_request_issue_links",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pull_request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("issue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "issue_id"],
            ["issues.project_id", "issues.id"],
            ondelete="CASCADE",
            name="fk_pr_issue_link_issue",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_issue_link_pull_request",
        ),
        sa.PrimaryKeyConstraint("project_id", "pull_request_id"),
    )
    op.create_index(
        "ix_pr_issue_link_issue",
        "pull_request_issue_links",
        ["project_id", "issue_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_pr_issue_link_issue", table_name="pull_request_issue_links")
    op.drop_table("pull_request_issue_links")
    op.drop_index("ix_pr_dependencies_blocked_by", table_name="pull_request_dependencies")
    op.drop_table("pull_request_dependencies")
    op.drop_index("ix_pull_requests_project_queue", table_name="pull_requests")
    op.drop_table("pull_requests")
    op.drop_constraint("uq_issues_project_id_id", "issues", type_="unique")
