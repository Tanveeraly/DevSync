"""Project-scoped GitHub pull requests and queue metadata."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class PullRequest(TimestampMixin, Base):
    __tablename__ = "pull_requests"
    __table_args__ = (
        UniqueConstraint("project_id", "github_number", name="uq_pull_request_project_number"),
        UniqueConstraint("project_id", "id", name="uq_pull_request_project_id_id"),
        Index("ix_pull_requests_project_queue", "project_id", "queue_position", "github_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    github_number: Mapped[int] = mapped_column(Integer, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    head_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    state: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open", server_default="open"
    )
    is_draft: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    check_summary: Mapped[str | None] = mapped_column(String(50), nullable=True)
    review_summary: Mapped[str | None] = mapped_column(String(50), nullable=True)
    github_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    merged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    queue_position: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )

    project: Mapped[Project] = relationship("Project", back_populates="pull_requests")  # noqa: F821


class PullRequestDependency(Base):
    """A same-project edge from a blocked PR to the PR that blocks it."""

    __tablename__ = "pull_request_dependencies"
    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_dependency_pull_request",
        ),
        ForeignKeyConstraint(
            ["project_id", "blocked_by_pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_dependency_blocked_by",
        ),
        CheckConstraint(
            "pull_request_id != blocked_by_pull_request_id",
            name="ck_pr_dependency_not_self",
        ),
        Index("ix_pr_dependencies_blocked_by", "project_id", "blocked_by_pull_request_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    pull_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    blocked_by_pull_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PullRequestIssueLink(Base):
    """Link one PR to at most one issue in the same project."""

    __tablename__ = "pull_request_issue_links"
    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "pull_request_id"],
            ["pull_requests.project_id", "pull_requests.id"],
            ondelete="CASCADE",
            name="fk_pr_issue_link_pull_request",
        ),
        ForeignKeyConstraint(
            ["project_id", "issue_id"],
            ["issues.project_id", "issues.id"],
            ondelete="CASCADE",
            name="fk_pr_issue_link_issue",
        ),
        Index("ix_pr_issue_link_issue", "project_id", "issue_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    pull_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    issue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
