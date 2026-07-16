"""Issue ORM model with optimistic locking via version column."""

from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class IssueStatus(StrEnum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class IssuePriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Issue(TimestampMixin, Base):
    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    column_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("columns.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="issue_status", create_constraint=True),
        default=IssueStatus.BACKLOG,
        nullable=False,
    )
    priority: Mapped[IssuePriority] = mapped_column(
        Enum(IssuePriority, name="issue_priority", create_constraint=True),
        default=IssuePriority.MEDIUM,
        nullable=False,
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Optimistic locking – callers must supply the current version on update.
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    branch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pr_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    labels: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=list)

    # ── Relationships ────────────────────────────────────────────────────
    column: Mapped[Column | None] = relationship(  # noqa: F821
        "Column", back_populates="issues",
    )
    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="issues",
    )
    assignee: Mapped[User | None] = relationship(  # noqa: F821
        "User", foreign_keys=[assignee_id], lazy="selectin",
    )
    reporter: Mapped[User] = relationship(  # noqa: F821
        "User", foreign_keys=[reporter_id], lazy="selectin",
    )
    comments: Mapped[list[Comment]] = relationship(  # noqa: F821
        "Comment", back_populates="issue", cascade="all, delete-orphan", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Issue {self.title!r} v{self.version}>"
