import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

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
    owner: UserRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: MemberRole = MemberRole.MEMBER


class ProjectMemberRoleUpdate(BaseModel):
    role: MemberRole

    @field_validator("role")
    @classmethod
    def role_must_not_be_owner(cls, value: MemberRole) -> MemberRole:
        if value == MemberRole.OWNER:
            raise ValueError("Project ownership cannot be changed here")
        return value


class ProjectMemberRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    user: UserRead
    role: MemberRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMembershipsRead(BaseModel):
    members: list[ProjectMemberRead]
    current_user_role: MemberRole


class ProjectInvitationCreate(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.MEMBER

    @field_validator("role")
    @classmethod
    def role_must_not_be_owner(cls, value: MemberRole) -> MemberRole:
        if value == MemberRole.OWNER:
            raise ValueError("Project ownership cannot be granted by invitation")
        return value


class ProjectInvitationResult(BaseModel):
    status: Literal["added", "invited"]
    email: EmailStr
    membership: ProjectMemberRead | None = None


class ProjectInvitationAccept(BaseModel):
    token: str


class ProjectInvitationAcceptedRead(BaseModel):
    project_slug: str
    project_name: str
    role: MemberRole
