import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.issue import IssuePriority, IssueStatus
from app.schemas.user import UserRead


class IssueBase(BaseModel):
    title: str
    description: str | None = None
    status: IssueStatus = IssueStatus.BACKLOG
    priority: IssuePriority = IssuePriority.MEDIUM
    branch_name: str | None = None
    pr_url: str | None = None
    labels: list[str] = []


class IssueCreate(IssueBase):
    assignee_id: uuid.UUID | None = None


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: IssueStatus | None = None
    priority: IssuePriority | None = None
    assignee_id: uuid.UUID | None = None
    column_id: uuid.UUID | None = None
    branch_name: str | None = None
    pr_url: str | None = None
    labels: list[str] | None = None
    version: int  # Required for optimistic locking check


class IssueMoveRequest(BaseModel):
    column_id: uuid.UUID | None = None
    position: int
    version: int  # Required for optimistic locking check


class IssueRead(IssueBase):
    id: uuid.UUID
    column_id: uuid.UUID | None
    project_id: uuid.UUID
    assignee_id: uuid.UUID | None
    reporter_id: uuid.UUID
    position: int
    version: int
    created_at: datetime
    updated_at: datetime

    assignee: UserRead | None = None
    reporter: UserRead

    model_config = ConfigDict(from_attributes=True)
