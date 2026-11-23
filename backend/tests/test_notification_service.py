import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.models.issue import Issue, IssuePriority, IssueStatus
from app.models.notification import Notification
from app.models.project import Project
from app.models.user import User
from app.services.email_service import _build_issue_assigned_email
from app.services.notification_service import (
    ensure_assignee_is_member,
    mark_read,
    notify_issue_assigned,
    user_channel,
)


def _user(name: str) -> User:
    return User(
        id=uuid.uuid4(), email=f"{name}@example.com", username=name, full_name=name.title(),
        is_active=True,
    )


def _setup(assignee: User | None, actor: User):
    project = Project(
        id=uuid.uuid4(), name="Apollo", slug="apollo", description="Moon app", owner_id=actor.id
    )
    issue = Issue(
        id=uuid.uuid4(),
        project_id=project.id,
        reporter_id=actor.id,
        assignee_id=assignee.id if assignee else None,
        title="Build login",
        description="OAuth + email",
        status=IssueStatus.TODO,
        priority=IssuePriority.HIGH,
        labels=["auth"],
    )
    by_type = {User: assignee, Project: project}
    session = Mock()
    session.get = AsyncMock(side_effect=lambda model, _id: by_type.get(model))
    session.flush = AsyncMock()

    async def _refresh(obj):
        obj.id = obj.id or uuid.uuid4()
        obj.is_read = False
        from datetime import UTC, datetime

        obj.created_at = datetime.now(UTC)

    session.refresh = AsyncMock(side_effect=_refresh)
    return session, project, issue


@pytest.mark.asyncio
async def test_assignee_gets_notification_with_task_details() -> None:
    actor, assignee = _user("owner"), _user("dev")
    session, project, issue = _setup(assignee, actor)
    tasks = BackgroundTasks()

    notification = await notify_issue_assigned(session, tasks, issue, actor)

    assert notification is not None
    assert notification.user_id == assignee.id
    assert notification.issue_id == issue.id
    assert notification.data["project_name"] == "Apollo"
    assert notification.data["issue_title"] == "Build login"
    assert notification.data["priority"] == "High"
    assert notification.data["link"].endswith(f"/board/apollo?issue={issue.id}")
    session.add.assert_called_once_with(notification)

    # One live push to the assignee's personal channel, one email to the assignee.
    assert len(tasks.tasks) == 2
    push, email = tasks.tasks
    assert push.args[0] == user_channel(assignee.id)
    assert email.args[0] == assignee.email


@pytest.mark.asyncio
async def test_no_notification_without_assignee_or_on_self_assignment() -> None:
    actor = _user("owner")

    session, _, unassigned = _setup(None, actor)
    tasks = BackgroundTasks()
    assert await notify_issue_assigned(session, tasks, unassigned, actor) is None

    session, _, self_assigned = _setup(actor, actor)
    assert await notify_issue_assigned(session, tasks, self_assigned, actor) is None

    assert tasks.tasks == []


@pytest.mark.asyncio
async def test_assignee_must_be_project_member() -> None:
    result = Mock()
    result.scalar_one_or_none.return_value = None
    session = Mock()
    session.execute = AsyncMock(return_value=result)

    with pytest.raises(HTTPException) as exc:
        await ensure_assignee_is_member(session, uuid.uuid4(), uuid.uuid4())
    assert exc.value.status_code == 400

    # No assignee: nothing to check.
    await ensure_assignee_is_member(session, uuid.uuid4(), None)


@pytest.mark.asyncio
async def test_cannot_read_someone_elses_notification() -> None:
    owner_id = uuid.uuid4()
    notification = Notification(id=uuid.uuid4(), user_id=owner_id, type="x", title="t")
    session = Mock()
    session.get = AsyncMock(return_value=notification)
    session.flush = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await mark_read(session, uuid.uuid4(), notification.id)
    assert exc.value.status_code == 404

    await mark_read(session, owner_id, notification.id)
    assert notification.is_read is True


def test_assignment_email_includes_details_and_escapes_html() -> None:
    msg = _build_issue_assigned_email(
        "dev@example.com",
        "Dev",
        {
            "project_name": "Apollo",
            "project_description": "Moon app",
            "issue_title": "<script>x</script>",
            "issue_description": "OAuth + email",
            "priority": "High",
            "status": "Todo",
            "labels": ["auth"],
            "assigned_by": "Owner",
            "link": "http://localhost:3000/board/apollo?issue=1",
        },
    )
    plain, html = (part.get_payload(decode=True).decode() for part in msg.get_payload())

    assert msg["To"] == "dev@example.com"
    for expected in ("Apollo", "Moon app", "OAuth + email", "High", "auth", "Owner"):
        assert expected in plain
    assert "&lt;script&gt;" in html and "<script>" not in html
