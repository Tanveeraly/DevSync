import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.issue import IssueRead


class ColumnBase(BaseModel):
    name: str
    position: int = 0


class ColumnCreate(ColumnBase):
    pass


class ColumnUpdate(BaseModel):
    name: str | None = None
    position: int | None = None


class ColumnRead(ColumnBase):
    id: uuid.UUID
    board_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    issues: list[IssueRead] = []

    model_config = ConfigDict(from_attributes=True)


class BoardBase(BaseModel):
    name: str


class BoardCreate(BoardBase):
    pass


class BoardUpdate(BaseModel):
    name: str | None = None


class BoardRead(BoardBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    columns: list[ColumnRead] = []

    model_config = ConfigDict(from_attributes=True)
