import uuid

import pytest
from pydantic import ValidationError

from app.core.security import validate_token
from app.models.project import MemberRole
from app.schemas.project import ProjectInvitationCreate
from app.services.project_invitation_service import create_invitation_token


def test_invitation_token_is_scoped_to_invitation_and_email() -> None:
    invitation_id = uuid.uuid4()

    payload = validate_token(
        create_invitation_token(invitation_id, "Person@example.com")
    )

    assert payload["type"] == "project_invitation"
    assert payload["invitation_id"] == str(invitation_id)
    assert payload["email"] == "person@example.com"


def test_project_invitation_cannot_grant_owner_role() -> None:
    with pytest.raises(ValidationError):
        ProjectInvitationCreate(
            email="person@example.com",
            role=MemberRole.OWNER,
        )


def test_project_invitation_defaults_to_member_role() -> None:
    invitation = ProjectInvitationCreate(email="person@example.com")

    assert invitation.role == MemberRole.MEMBER
