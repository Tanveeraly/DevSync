"""GitHubToken ORM model – stores encrypted OAuth tokens."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class GitHubToken(TimestampMixin, Base):
    __tablename__ = "github_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # stored encrypted
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(String(50), default="bearer", nullable=False)
    scope: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped[User] = relationship(  # noqa: F821
        "User", back_populates="github_tokens",
    )

    def __repr__(self) -> str:
        return f"<GitHubToken user={self.user_id}>"
