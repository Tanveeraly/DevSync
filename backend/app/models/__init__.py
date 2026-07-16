"""Import all models so Alembic can discover them."""

from app.models.activity import ActivityLog  # noqa: F401
from app.models.base import Base, TimestampMixin  # noqa: F401
from app.models.board import Board, Column  # noqa: F401
from app.models.comment import Comment  # noqa: F401
from app.models.github_token import GitHubToken  # noqa: F401
from app.models.issue import Issue  # noqa: F401
from app.models.project import Project, ProjectMember  # noqa: F401
from app.models.user import User  # noqa: F401

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Project",
    "ProjectMember",
    "Board",
    "Column",
    "Issue",
    "Comment",
    "ActivityLog",
    "GitHubToken",
]
