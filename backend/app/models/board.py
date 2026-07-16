"""Board & Column ORM models."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Board(TimestampMixin, Base):
    __tablename__ = "boards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Relationships ────────────────────────────────────────────────────
    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="boards",
    )
    columns: Mapped[list[Column]] = relationship(
        "Column", back_populates="board", cascade="all, delete-orphan",
        order_by="Column.position", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Board {self.name!r}>"


class Column(TimestampMixin, Base):
    __tablename__ = "columns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Relationships ────────────────────────────────────────────────────
    board: Mapped[Board] = relationship("Board", back_populates="columns")
    issues: Mapped[list[Issue]] = relationship(  # noqa: F821
        "Issue", back_populates="column", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Column {self.name!r} pos={self.position}>"
