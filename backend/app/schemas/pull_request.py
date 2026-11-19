import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PullRequestDependencyCreate(BaseModel):
    blocked_by_pull_request_number: int = Field(gt=0)


class PullRequestIssueLinkCreate(BaseModel):
    issue_id: uuid.UUID


class PullRequestReorder(BaseModel):
    numbers: list[int]

    @field_validator("numbers")
    @classmethod
    def numbers_must_be_positive_and_unique(cls, value: list[int]) -> list[int]:
        if any(number < 1 for number in value):
            raise ValueError("Pull request numbers must be positive")
        if len(value) != len(set(value)):
            raise ValueError("Pull request order cannot contain duplicate numbers")
        return value


class PullRequestBlockerRead(BaseModel):
    id: uuid.UUID
    github_number: int
    title: str
    url: str

    model_config = ConfigDict(from_attributes=True)


class PullRequestRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    github_number: int
    url: str
    title: str
    head_branch: str | None
    state: str
    is_draft: bool
    check_summary: str | None
    review_summary: str | None
    github_updated_at: datetime | None
    merged_at: datetime | None
    last_synced_at: datetime | None
    queue_position: int
    linked_issue_id: uuid.UUID | None
    linked_issue_title: str | None
    ready: bool
    blocked_by: list[PullRequestBlockerRead]

    model_config = ConfigDict(from_attributes=True)
