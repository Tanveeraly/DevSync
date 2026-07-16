import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.project import MemberRole
from app.schemas.user import UserRead


class ProjectBase(BaseModel):
    name: str
    slug: str
    description: str | None = None
    github_repo_url: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    github_repo_url: str | None = None


class ProjectRead(ProjectBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    owner: UserRead
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: MemberRole = MemberRole.MEMBER


class ProjectMemberRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    user: UserRead
    role: MemberRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
