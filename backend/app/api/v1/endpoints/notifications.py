import uuid

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DBSession
from app.schemas.notification import NotificationRead, UnreadCount
from app.services.notification_service import (
    count_unread,
    list_notifications,
    mark_all_read,
    mark_read,
)

router = APIRouter()


@router.get("", response_model=list[NotificationRead])
async def get_my_notifications(
    session: DBSession,
    current_user: CurrentUser,
    unread_only: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
):
    """List the current user's notifications, newest first."""
    return await list_notifications(session, current_user.id, unread_only, limit)


@router.get("/unread-count", response_model=UnreadCount)
async def get_unread_count(session: DBSession, current_user: CurrentUser):
    return UnreadCount(unread=await count_unread(session, current_user.id))


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all_notifications(session: DBSession, current_user: CurrentUser):
    await mark_all_read(session, current_user.id)


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def read_notification(
    session: DBSession, notification_id: uuid.UUID, current_user: CurrentUser
):
    return await mark_read(session, current_user.id, notification_id)
