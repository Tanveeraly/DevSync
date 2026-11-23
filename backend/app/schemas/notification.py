import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID | None
    issue_id: uuid.UUID | None
    actor_id: uuid.UUID | None
    type: str
    title: str
    message: str | None
    data: dict | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCount(BaseModel):
    unread: int
