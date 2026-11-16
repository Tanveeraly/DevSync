import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models.project import MemberRole, ProjectMember
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberAdd,
    ProjectMemberRead,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.user import UserRead
from app.services.github_service import get_github_stats
from app.services.github_auth_service import get_linked_github_token
from app.services.project_service import (
    add_project_member,
    check_user_membership,
    create_project,
    delete_project,
    get_project_by_slug,
    list_user_projects,
    remove_project_member,
    sync_project_contributors,
    update_project,
)

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
    stats = await get_github_stats(project.github_repo_url, token)
    if stats.get("contributors"):
        try:
            await sync_project_contributors(session, project.id, stats["contributors"])
            await session.commit()
        except Exception:
            pass
    return stats


@router.get("/{slug}/members", response_model=list[UserRead])
async def list_project_members(session: DBSession, slug: str, current_user: CurrentUser):
    """List all assignable members and GitHub contributors for a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)

    # Sync GitHub contributors if project has a repository URL
    if project.github_repo_url:
        try:
            token = await get_linked_github_token(session, current_user.id)
            stats = await get_github_stats(project.github_repo_url, token)
            if stats.get("contributors"):
                await sync_project_contributors(session, project.id, stats["contributors"])
                await session.commit()
        except Exception:
            pass

    stmt = (
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project.id, User.is_active == True)
        .order_by(User.full_name, User.username)
    )
    result = await session.execute(stmt)
    members = list(result.scalars().all())

    # Fallback to all active users if project members list is empty
    if not members:
        all_res = await session.execute(select(User).where(User.is_active == True))
        members = list(all_res.scalars().all())

    return members



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
    return await add_project_member(session, project.id, data.user_id, data.role)


@router.delete("/{slug}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(session: DBSession, slug: str, user_id: uuid.UUID, current_user: CurrentUser):
    """Remove a user from a project (requires Owner/Admin permissions)."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id, min_role=MemberRole.ADMIN)
    await remove_project_member(session, project.id, user_id)
