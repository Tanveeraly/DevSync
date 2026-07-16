import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.api.v1.endpoints.projects import check_access
from app.schemas.comment import CommentCreate, CommentRead
from app.services.comment_service import create_comment, delete_comment, list_issue_comments
from app.services.issue_service import get_issue_by_id
from app.websockets.manager import manager as ws_manager

router = APIRouter()


@router.post("/issues/{issue_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def create_new_comment(
    session: DBSession, issue_id: uuid.UUID, data: CommentCreate, current_user: CurrentUser
):
    """Add a comment to an issue."""
    issue = await get_issue_by_id(session, issue_id)
    await check_access(session, issue.project_id, current_user.id)
    
    comment = await create_comment(session, issue_id, current_user.id, data.content)
    
    # Broadcast event
    comment_data = CommentRead.model_validate(comment).model_dump(mode="json")
    await ws_manager.broadcast(
        str(issue.project_id),
        {
            "event": "comment_created",
            "data": comment_data,
        }
    )
    return comment


@router.get("/issues/{issue_id}/comments", response_model=list[CommentRead])
async def list_comments(session: DBSession, issue_id: uuid.UUID, current_user: CurrentUser):
    """List all comments for an issue."""
    issue = await get_issue_by_id(session, issue_id)
    await check_access(session, issue.project_id, current_user.id)
    return await list_issue_comments(session, issue_id)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment_by_id(session: DBSession, comment_id: uuid.UUID, current_user: CurrentUser):
    """Delete a comment (only owner of the comment can delete it)."""
    # Delete (raises 403 if user_id doesn't match)
    await delete_comment(session, comment_id, current_user.id)
