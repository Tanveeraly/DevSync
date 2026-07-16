import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserRead


class ActivityRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    action: str
    entity_type: str
    entity_id: str
    details: dict | None = None
    created_at: datetime
    updated_at: datetime
    user: UserRead

    model_config = ConfigDict(from_attributes=True)
