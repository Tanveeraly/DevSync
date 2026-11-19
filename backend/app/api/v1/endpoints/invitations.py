from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.schemas.project import (
    ProjectInvitationAccept,
    ProjectInvitationAcceptedRead,
)
from app.services.project_invitation_service import accept_project_invitation

router = APIRouter()


@router.post("/accept", response_model=ProjectInvitationAcceptedRead)
async def accept_invitation(
    session: DBSession,
    data: ProjectInvitationAccept,
    current_user: CurrentUser,
) -> ProjectInvitationAcceptedRead:
    return await accept_project_invitation(session, data.token, current_user)
