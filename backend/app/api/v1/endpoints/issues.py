import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.api.v1.endpoints.projects import check_access, get_project_by_slug
from app.schemas.issue import IssueCreate, IssueMoveRequest, IssueRead, IssueUpdate
from app.services.activity_service import log_activity
from app.services.issue_service import (
    create_issue,
    delete_issue,
    get_issue_by_id,
    list_project_issues,
    move_issue_position,
    update_issue,
)
from app.websockets.manager import manager as ws_manager

router = APIRouter()


@router.post("/projects/{slug}/issues", response_model=IssueRead, status_code=status.HTTP_201_CREATED)
async def create_new_issue(
    session: DBSession, slug: str, data: IssueCreate, current_user: CurrentUser
):
    """Create a new issue in a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    
    issue = await create_issue(session, project.id, current_user.id, data)
    
    # Audit log
    await log_activity(
        session,
        project.id,
        current_user.id,
        action="create",
        entity_type="issue",
        entity_id=str(issue.id),
        details={"title": issue.title},
    )
    
    # Broadcast event
    issue_data = IssueRead.model_validate(issue).model_dump(mode="json")
    await ws_manager.broadcast(
        str(project.id),
        {
            "event": "issue_created",
            "data": issue_data,
        }
    )
    return issue


@router.get("/projects/{slug}/issues", response_model=list[IssueRead])
async def list_issues(session: DBSession, slug: str, current_user: CurrentUser):
    """List all issues in a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    return await list_project_issues(session, project.id)


@router.get("/issues/{issue_id}", response_model=IssueRead)
async def get_issue(session: DBSession, issue_id: uuid.UUID, current_user: CurrentUser):
    """Get issue details by ID."""
    issue = await get_issue_by_id(session, issue_id)
    await check_access(session, issue.project_id, current_user.id)
    return issue


@router.patch("/issues/{issue_id}", response_model=IssueRead)
async def update_issue_details(
    session: DBSession, issue_id: uuid.UUID, data: IssueUpdate, current_user: CurrentUser
):
    """Update issue details (implements optimistic locking: 409 conflict if version is outdated)."""
    # Check access before updating
    existing = await get_issue_by_id(session, issue_id)
    await check_access(session, existing.project_id, current_user.id)
    
    # Perform update (raises 409 if version mismatch)
    issue = await update_issue(session, issue_id, data)
    
    # Audit log
    await log_activity(
        session,
        issue.project_id,
        current_user.id,
        action="update",
        entity_type="issue",
        entity_id=str(issue.id),
        details={"title": issue.title, "version": issue.version},
    )
    
    # Broadcast event
    issue_data = IssueRead.model_validate(issue).model_dump(mode="json")
    await ws_manager.broadcast(
        str(issue.project_id),
        {
            "event": "issue_updated",
            "data": issue_data,
        }
    )
    return issue


@router.patch("/issues/{issue_id}/move", response_model=IssueRead)
async def move_issue(
    session: DBSession, issue_id: uuid.UUID, data: IssueMoveRequest, current_user: CurrentUser
):
    """Move issue to a new column and position (implements optimistic locking)."""
    # Check access
    existing = await get_issue_by_id(session, issue_id)
    await check_access(session, existing.project_id, current_user.id)
    
    # Perform move (raises 409 if version mismatch)
    issue = await move_issue_position(
        session, issue_id, data.column_id, data.position, data.version
    )
    
    # Audit log
    await log_activity(
        session,
        issue.project_id,
        current_user.id,
        action="move",
        entity_type="issue",
        entity_id=str(issue.id),
        details={
            "column_id": str(issue.column_id) if issue.column_id else None,
            "position": issue.position,
            "status": issue.status.value,
            "version": issue.version,
        },
    )
    
    # Broadcast event
    issue_data = IssueRead.model_validate(issue).model_dump(mode="json")
    await ws_manager.broadcast(
        str(issue.project_id),
        {
            "event": "issue_moved",
            "data": issue_data,
        }
    )
    return issue


@router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue_by_id(session: DBSession, issue_id: uuid.UUID, current_user: CurrentUser):
    """Delete an issue."""
    existing = await get_issue_by_id(session, issue_id)
    await check_access(session, existing.project_id, current_user.id)
    
    project_id = existing.project_id
    title = existing.title
    
    await delete_issue(session, issue_id)
    
    # Audit log
    await log_activity(
        session,
        project_id,
        current_user.id,
        action="delete",
        entity_type="issue",
        entity_id=str(issue_id),
        details={"title": title},
    )
    
    # Broadcast event
    await ws_manager.broadcast(
        str(project_id),
        {
            "event": "issue_deleted",
            "data": {"id": str(issue_id)},
        }
    )
