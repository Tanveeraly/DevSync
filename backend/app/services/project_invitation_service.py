"""Project member invitations and acceptance."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import create_token, validate_token
from app.models.project import MemberRole, Project, ProjectMember
from app.models.project_invitation import ProjectInvitation
from app.models.user import User
from app.schemas.project import ProjectInvitationAcceptedRead
from app.services.email_service import send_project_invitation_email
from app.services.project_service import add_project_member

INVITATION_LIFETIME = timedelta(days=7)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def create_invitation_token(invitation_id: uuid.UUID, email: str) -> str:
    return create_token(
        {
            "type": "project_invitation",
            "invitation_id": str(invitation_id),
            "email": email.casefold(),
        },
        expires_delta=INVITATION_LIFETIME,
    )


async def invite_project_member(
    session: AsyncSession,
    project: Project,
    inviter: User,
    email: str,
    role: MemberRole,
) -> tuple[str, ProjectMember | None]:
    normalized_email = email.strip().casefold()
    existing_user_result = await session.execute(
        select(User).where(
            func.lower(User.email) == normalized_email,
        )
    )
    existing_user = existing_user_result.scalar_one_or_none()

    if existing_user is not None:
        if not existing_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This DevSync account is inactive and cannot be invited",
            )
        membership_result = await session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == existing_user.id,
            )
        )
        if membership_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This user is already a member of the project",
            )
        member = await add_project_member(session, project.id, existing_user.id, role)
        return "added", member

    pending_result = await session.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project.id,
            func.lower(ProjectInvitation.email) == normalized_email,
            ProjectInvitation.accepted_at.is_(None),
        )
    )
    pending = pending_result.scalar_one_or_none()
    if pending is not None:
        if _as_utc(pending.expires_at) > datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An invitation is already pending for this email",
            )
        await session.delete(pending)

    invitation = ProjectInvitation(
        project_id=project.id,
        invited_by_id=inviter.id,
        email=normalized_email,
        role=role,
        expires_at=datetime.now(UTC) + INVITATION_LIFETIME,
    )
    session.add(invitation)
    await session.flush()

    token = create_invitation_token(invitation.id, normalized_email)
    invitation_link = f"{settings.FRONTEND_URL}/invitation?token={token}"
    inviter_name = inviter.full_name or inviter.username
    await send_project_invitation_email(
        normalized_email,
        project.name,
        inviter_name,
        invitation_link,
    )
    return "invited", None


async def accept_project_invitation(
    session: AsyncSession, token: str, user: User
) -> ProjectInvitationAcceptedRead:
    try:
        payload = validate_token(token)
        invitation_id = uuid.UUID(str(payload.get("invitation_id", "")))
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation link is invalid or expired",
        ) from exc

    token_email = str(payload.get("email", "")).casefold()
    if payload.get("type") != "project_invitation" or token_email != user.email.casefold():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sign in with the email address that received this invitation",
        )

    invitation_result = await session.execute(
        select(ProjectInvitation)
        .options(selectinload(ProjectInvitation.project))
        .where(ProjectInvitation.id == invitation_id)
    )
    invitation = invitation_result.scalar_one_or_none()
    if invitation is None or invitation.email.casefold() != token_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation link is invalid or expired",
        )
    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This invitation has already been accepted",
        )
    if _as_utc(invitation.expires_at) <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired",
        )

    membership_result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == invitation.project_id,
            ProjectMember.user_id == user.id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    if membership is None:
        await add_project_member(
            session, invitation.project_id, user.id, invitation.role
        )
        accepted_role = invitation.role
    else:
        accepted_role = membership.role

    invitation.accepted_at = datetime.now(UTC)
    await session.flush()
    return ProjectInvitationAcceptedRead(
        project_slug=invitation.project.slug,
        project_name=invitation.project.name,
        role=accepted_role,
    )
