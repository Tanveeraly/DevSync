from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DBSession
from app.api.v1.endpoints.projects import check_access, get_project_by_slug
from app.schemas.activity import ActivityRead
from app.services.activity_service import list_project_activities

router = APIRouter()


@router.get("/projects/{slug}/activities", response_model=list[ActivityRead])
async def list_activities(
    session: DBSession,
    slug: str,
    current_user: CurrentUser,
    limit: int = Query(default=50, le=100),
):
    """Retrieve recent activity logs for a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    return await list_project_activities(session, project.id, limit=limit)
