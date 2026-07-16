"""User ORM model."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_id: Mapped[int | None] = mapped_column(nullable=True, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ────────────────────────────────────────────────────
    owned_projects: Mapped[list[Project]] = relationship(  # noqa: F821
        "Project", back_populates="owner", lazy="selectin",
    )
    memberships: Mapped[list[ProjectMember]] = relationship(  # noqa: F821
        "ProjectMember", back_populates="user", lazy="selectin",
    )
    github_tokens: Mapped[list[GitHubToken]] = relationship(  # noqa: F821
        "GitHubToken", back_populates="user", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User {self.username!r}>"
