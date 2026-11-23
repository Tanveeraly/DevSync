"""Import all models so Alembic can discover them."""

from app.models.activity import ActivityLog  # noqa: F401
from app.models.base import Base, TimestampMixin  # noqa: F401
from app.models.board import Board, Column  # noqa: F401
from app.models.comment import Comment  # noqa: F401
from app.models.github_token import GitHubToken  # noqa: F401
from app.models.issue import Issue  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.project import Project, ProjectMember  # noqa: F401
from app.models.project_invitation import ProjectInvitation  # noqa: F401
from app.models.pull_request import (  # noqa: F401
    PullRequest,
    PullRequestDependency,
    PullRequestIssueLink,
)
from app.models.user import User  # noqa: F401

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Project",
    "ProjectMember",
    "ProjectInvitation",
    "PullRequest",
    "PullRequestDependency",
    "PullRequestIssueLink",
    "Board",
    "Column",
    "Issue",
    "Comment",
    "ActivityLog",
    "GitHubToken",
    "Notification",
]
