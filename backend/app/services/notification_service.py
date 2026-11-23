"""Per-user notifications.

When a task is assigned, only the assignee is notified. They get a stored
in-app notification (pushed live over their personal WebSocket channel) and an
email with the full task details.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.issue import Issue
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.notification import NotificationRead
from app.services.email_service import send_issue_assigned_email
from app.websockets.manager import manager as ws_manager

logger = logging.getLogger(__name__)

ISSUE_ASSIGNED = "issue_assigned"


def user_channel(user_id: uuid.UUID | str) -> str:
    """WebSocket channel that only the given user subscribes to."""
    return f"user:{user_id}"


def issue_link(project_slug: str, issue_id: uuid.UUID) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/board/{project_slug}?issue={issue_id}"


def _label(value: object) -> str:
    raw = getattr(value, "value", value)
    return str(raw).replace("_", " ").title() if raw is not None else ""


async def ensure_assignee_is_member(
    session: AsyncSession, project_id: uuid.UUID, assignee_id: uuid.UUID | None
) -> None:
    """Reject assigning a task to someone outside the project.

    Without this, task details could be emailed to a non-member.
    """
    if assignee_id is None:
        return
    result = await session.execute(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == assignee_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a member of this project",
        )


async def notify_issue_assigned(
    session: AsyncSession,
    background_tasks: BackgroundTasks,
    issue: Issue,
    actor: User,
) -> Notification | None:
    """Notify the issue's assignee (and nobody else) that the task is theirs.

    Self-assignment does not notify. Delivery (WebSocket push and email) is
    scheduled as background tasks so it runs after the request commits.
    """
    if issue.assignee_id is None or issue.assignee_id == actor.id:
        return None

    assignee = await session.get(User, issue.assignee_id)
    project = await session.get(Project, issue.project_id)
    if assignee is None or not assignee.is_active or project is None:
        return None

    actor_name = actor.full_name or actor.username
    link = issue_link(project.slug, issue.id)
    details = {
        "project_name": project.name,
        "project_slug": project.slug,
        "project_description": project.description,
        "issue_title": issue.title,
        "issue_description": issue.description,
        "priority": _label(issue.priority),
        "status": _label(issue.status),
        "labels": list(issue.labels or []),
        "branch_name": issue.branch_name,
        "assigned_by": actor_name,
        "link": link,
    }

    notification = Notification(
        user_id=assignee.id,
        project_id=project.id,
        issue_id=issue.id,
        actor_id=actor.id,
        type=ISSUE_ASSIGNED,
        title=f"New task assigned in {project.name}",
        message=f"{actor_name} assigned you \"{issue.title}\"",
        data=details,
    )
    session.add(notification)
    await session.flush()
    await session.refresh(notification)

    payload = {
        "event": "notification_created",
        "data": NotificationRead.model_validate(notification).model_dump(mode="json"),
    }
    background_tasks.add_task(ws_manager.broadcast, user_channel(assignee.id), payload)
    background_tasks.add_task(
        send_issue_assigned_email, assignee.email, assignee.full_name or assignee.username, details
    )
    return notification


async def list_notifications(
    session: AsyncSession, user_id: uuid.UUID, unread_only: bool = False, limit: int = 50
) -> list[Notification]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_unread(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read.is_(False)
        )
    )
    return int(result.scalar() or 0)


async def mark_read(
    session: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID
) -> Notification:
    notification = await session.get(Notification, notification_id)
    # Same 404 for "missing" and "someone else's" so ids can't be probed.
    if notification is None or notification.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    await session.flush()
    return notification


async def mark_all_read(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
