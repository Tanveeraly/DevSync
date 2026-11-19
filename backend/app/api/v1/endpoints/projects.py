import uuid

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models.project import MemberRole, ProjectMember
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectInvitationCreate,
    ProjectInvitationResult,
    ProjectMemberAdd,
    ProjectMemberRead,
    ProjectMemberRoleUpdate,
    ProjectMembershipsRead,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.user import UserRead
from app.services.github_auth_service import (
    get_github_collaborators,
    get_linked_github_token,
)
from app.services.github_service import get_github_stats
from app.services.project_invitation_service import invite_project_member
from app.services.project_service import (
    add_project_member,
    check_user_membership,
    create_project,
    delete_project,
    get_project_by_slug,
    list_project_memberships,
    list_user_projects,
    remove_project_member,
    update_project,
    update_project_member_role,
)
from app.websockets.manager import manager as ws_manager

router = APIRouter()


async def check_access(session: DBSession, project_id: uuid.UUID, user_id: uuid.UUID, min_role: MemberRole | None = None) -> None:
    membership = await check_user_membership(session, project_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not a member of this project",
        )
    if min_role:
        role_hierarchy = {
            MemberRole.OWNER: 3,
            MemberRole.ADMIN: 2,
            MemberRole.MEMBER: 1,
        }
        user_level = role_hierarchy.get(membership.role, 0)
        required_level = role_hierarchy.get(min_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient role permissions",
            )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_new_project(session: DBSession, data: ProjectCreate, current_user: CurrentUser):
    """Create a new project. The creator is added as the OWNER."""
    return await create_project(session, current_user.id, data)


@router.get("", response_model=list[ProjectRead])
async def list_projects(session: DBSession, current_user: CurrentUser):
    """List all projects that the current user is a member of."""
    return await list_user_projects(session, current_user.id)


@router.get("/{slug}", response_model=ProjectRead)
async def get_project(session: DBSession, slug: str, current_user: CurrentUser):
    """Get project details by slug."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    return project


@router.get("/{slug}/github-stats")
async def get_project_github_stats(session: DBSession, slug: str, current_user: CurrentUser):
    """Get real-time GitHub repository statistics using the current user's token."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    token = await get_linked_github_token(session, current_user.id)
    return await get_github_stats(project.github_repo_url, token)


@router.get("/{slug}/members", response_model=list[UserRead])
async def list_project_members(session: DBSession, slug: str, current_user: CurrentUser):
    """List only users explicitly added to the project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)

    stmt = (
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project.id,
            User.is_active.is_(True),
        )
        .order_by(User.full_name, User.username)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{slug}/memberships", response_model=ProjectMembershipsRead)
async def list_project_memberships_with_roles(
    session: DBSession, slug: str, current_user: CurrentUser
):
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    current_membership = await check_user_membership(
        session, project.id, current_user.id
    )
    return ProjectMembershipsRead(
        members=await list_project_memberships(session, project.id),
        current_user_role=current_membership.role,
    )


@router.patch("/{slug}", response_model=ProjectRead)
async def update_project_details(
    session: DBSession, slug: str, data: ProjectUpdate, current_user: CurrentUser
):
    """Update project details (requires Owner/Admin permissions)."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    return await update_project(session, project.id, data)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_by_slug(session: DBSession, slug: str, current_user: CurrentUser):
    """Delete a project (requires Owner permissions)."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.OWNER)
    await delete_project(session, project.id)


@router.post("/{slug}/members", response_model=ProjectMemberRead)
async def add_member(
    session: DBSession, slug: str, data: ProjectMemberAdd, current_user: CurrentUser
):
    """Add a user to a project (requires Owner/Admin permissions)."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    if data.role == MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ownership cannot be granted here",
        )
    if data.role == MemberRole.ADMIN:
        actor_membership = await check_user_membership(
            session, project.id, current_user.id
        )
        if actor_membership.role != MemberRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the project owner can grant the admin role",
            )
    else:
        actor_membership = await check_user_membership(
            session, project.id, current_user.id
        )
        target_membership = await check_user_membership(
            session, project.id, data.user_id
        )
        if (
            target_membership
            and target_membership.role == MemberRole.ADMIN
            and actor_membership.role != MemberRole.OWNER
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the project owner can change admin roles",
            )
    return await add_project_member(session, project.id, data.user_id, data.role)


@router.post(
    "/{slug}/invitations",
    response_model=ProjectInvitationResult,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    session: DBSession,
    slug: str,
    data: ProjectInvitationCreate,
    current_user: CurrentUser,
):
    """Add an existing DevSync user or email an invitation to a new user."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    if data.role == MemberRole.ADMIN:
        actor_membership = await check_user_membership(
            session, project.id, current_user.id
        )
        if actor_membership.role != MemberRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the project owner can grant the admin role",
            )
    invite_status, membership = await invite_project_member(
        session, project, current_user, str(data.email), data.role
    )
    return ProjectInvitationResult(
        status=invite_status,
        email=data.email,
        membership=membership,
    )


@router.patch("/{slug}/members/{user_id}", response_model=ProjectMemberRead)
async def update_member_role(
    session: DBSession,
    slug: str,
    user_id: uuid.UUID,
    data: ProjectMemberRoleUpdate,
    current_user: CurrentUser,
):
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    actor_membership = await check_user_membership(
        session, project.id, current_user.id
    )
    target_membership = await check_user_membership(session, project.id, user_id)
    if target_membership is None or target_membership.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found",
        )
    if (
        target_membership.role == MemberRole.ADMIN
        or data.role == MemberRole.ADMIN
    ) and actor_membership.role != MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can change admin roles",
        )
    return await update_project_member_role(
        session, project.id, user_id, data.role
    )


@router.delete("/{slug}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(session: DBSession, slug: str, user_id: uuid.UUID, current_user: CurrentUser):
    """Remove a user from a project (requires Owner/Admin permissions)."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    actor_membership = await check_user_membership(
        session, project.id, current_user.id
    )
    target_membership = await check_user_membership(session, project.id, user_id)
    if (
        target_membership
        and target_membership.role == MemberRole.ADMIN
        and actor_membership.role != MemberRole.OWNER
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can remove an admin",
        )
    await remove_project_member(session, project.id, user_id)
    await ws_manager.revoke_user(str(project.id), str(user_id))


@router.get("/{slug}/github/collaborators")
async def preview_github_collaborators(
    session: DBSession, slug: str, current_user: CurrentUser
) -> list[dict[str, object]]:
    """Preview GitHub collaborators and match them to existing DevSync accounts."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    if not project.github_repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link a GitHub repository to this project first",
        )

    token = await get_linked_github_token(session, current_user.id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connect your GitHub account before importing collaborators",
        )
    try:
        collaborators = await get_github_collaborators(token, project.github_repo_url)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub could not list collaborators; verify repository access and OAuth permissions",
        ) from exc
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve GitHub repository collaborators",
        ) from exc

    users_result = await session.execute(select(User).where(User.is_active.is_(True)))
    users = users_result.scalars().all()
    users_by_login: dict[str, list[User]] = {}
    for user in users:
        users_by_login.setdefault(user.username.casefold(), []).append(user)
    users_by_github_id = {
        user.github_id: user for user in users if user.github_id is not None
    }

    member_result = await session.execute(
        select(ProjectMember.user_id).where(ProjectMember.project_id == project.id)
    )
    member_ids = set(member_result.scalars().all())

    preview = []
    for collaborator in collaborators:
        login = str(collaborator.get("login") or "")
        github_id = collaborator.get("id")
        login_matches = users_by_login.get(login.casefold(), [])
        matched_user = (
            users_by_github_id.get(github_id)
            if isinstance(github_id, int)
            else None
        ) or (login_matches[0] if len(login_matches) == 1 else None)
        permissions = collaborator.get("permissions")
        preview.append(
            {
                "login": login,
                "github_id": github_id,
                "avatar_url": collaborator.get("avatar_url"),
                "html_url": collaborator.get("html_url"),
                "permission": collaborator.get("role_name")
                or (
                    ", ".join(
                        name
                        for name, enabled in permissions.items()
                        if enabled is True
                    )
                    if isinstance(permissions, dict)
                    else None
                ),
                "user": UserRead.model_validate(matched_user)
                if matched_user
                else None,
                "is_member": bool(matched_user and matched_user.id in member_ids),
            }
        )
    return preview
