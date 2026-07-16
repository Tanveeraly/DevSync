import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import MemberRole, Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


async def create_project(session: AsyncSession, owner_id: uuid.UUID, data: ProjectCreate) -> Project:
    # Check if slug is unique
    result = await session.execute(select(Project).where(Project.slug == data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with slug '{data.slug}' already exists",
        )
    
    project = Project(
        name=data.name,
        slug=data.slug,
        description=data.description,
        github_repo_url=data.github_repo_url,
        owner_id=owner_id,
    )
    session.add(project)
    await session.flush()
    
    # Add owner as project member
    owner_member = ProjectMember(
        project_id=project.id,
        user_id=owner_id,
        role=MemberRole.OWNER,
    )
    session.add(owner_member)
    await session.flush()
    return project


async def list_user_projects(session: AsyncSession, user_id: uuid.UUID) -> list[Project]:
    # Select projects where user is a member
    stmt = (
        select(Project)
        .join(ProjectMember)
        .where(ProjectMember.user_id == user_id)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_project_by_slug(session: AsyncSession, slug: str) -> Project:
    result = await session.execute(select(Project).where(Project.slug == slug))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{slug}' not found",
        )
    return project


async def update_project(session: AsyncSession, project_id: uuid.UUID, data: ProjectUpdate) -> Project:
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.github_repo_url is not None:
        project.github_repo_url = data.github_repo_url
        
    await session.flush()
    return project


async def delete_project(session: AsyncSession, project_id: uuid.UUID) -> None:
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    await session.delete(project)
    await session.flush()


async def add_project_member(
    session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, role: MemberRole
) -> ProjectMember:
    # Check if user exists
    user_result = await session.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User to add not found",
        )
    
    # Check if member already exists
    member_result = await session.execute(
        select(ProjectMember).where(
            (ProjectMember.project_id == project_id) & (ProjectMember.user_id == user_id)
        )
    )
    existing_member = member_result.scalar_one_or_none()
    if existing_member:
        existing_member.role = role
        await session.flush()
        return existing_member
        
    member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        role=role,
    )
    session.add(member)
    await session.flush()
    return member


async def remove_project_member(session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await session.execute(
        select(ProjectMember).where(
            (ProjectMember.project_id == project_id) & (ProjectMember.user_id == user_id)
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found",
        )
    if member.role == MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the owner of the project",
        )
    await session.delete(member)
    await session.flush()


async def check_user_membership(session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> ProjectMember | None:
    result = await session.execute(
        select(ProjectMember).where(
            (ProjectMember.project_id == project_id) & (ProjectMember.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()
