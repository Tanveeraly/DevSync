import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.models.pull_request import PullRequest, PullRequestDependency
from app.services.pull_request_service import (
    _has_path,
    add_pull_request_dependency,
    link_pull_request_issue,
    list_project_pull_requests,
    remove_pull_request_dependency,
    reorder_project_pull_requests,
    sync_project_pull_requests,
)


def _scalar_result(value):
    result = Mock()
    result.scalar_one_or_none.return_value = value
    return result


def _scalars_result(values):
    result = Mock()
    result.scalars.return_value.all.return_value = values
    return result


def _rows_result(values):
    result = Mock()
    result.all.return_value = values
    return result


def _pull_request(project_id: uuid.UUID, number: int, position: int = 0) -> PullRequest:
    return PullRequest(
        id=uuid.uuid4(),
        project_id=project_id,
        github_number=number,
        url=f"https://github.com/acme/app/pull/{number}",
        title=f"PR {number}",
        state="open",
        is_draft=False,
        queue_position=position,
    )


@pytest.mark.asyncio
async def test_sync_updates_github_fields_but_not_queue_position_or_links() -> None:
    project_id = uuid.uuid4()
    existing = _pull_request(project_id, 41, position=7)
    session = Mock()
    session.execute = AsyncMock(
        side_effect=[
            _scalars_result([existing]),
            Mock(),
            _scalars_result([existing]),
            _rows_result([]),
            _rows_result([]),
        ]
    )
    session.flush = AsyncMock()

    await sync_project_pull_requests(
        session,
        project_id,
        [
            {
                "number": 41,
                "url": existing.url,
                "title": "Updated title",
                "state": "open",
                "check_summary": "failure",
            },
            {
                "number": 42,
                "url": "https://github.com/acme/app/pull/42",
                "title": "New PR",
                "state": "open",
            },
        ],
    )

    upsert = session.execute.await_args_list[1].args[0]
    sql = str(upsert.compile(dialect=postgresql.dialect()))
    update_clause = sql.split("DO UPDATE SET", maxsplit=1)[1]
    inserted_values = upsert._multi_values[0]

    assert "queue_position" not in update_clause
    assert "github_number" not in update_clause
    queue_position_column = PullRequest.__table__.c.queue_position
    assert inserted_values[0][queue_position_column] == 7
    assert inserted_values[1][queue_position_column] == 8
    assert "check_summary" in update_clause


@pytest.mark.asyncio
async def test_queue_explains_unmerged_blocker_but_ignores_merged_blocker() -> None:
    project_id = uuid.uuid4()
    active_blocker = _pull_request(project_id, 41)
    blocked_pr = _pull_request(project_id, 42, position=1)
    merged_blocker = _pull_request(project_id, 43, position=2)
    merged_blocker.merged_at = datetime.now(UTC)
    unblocked_pr = _pull_request(project_id, 44, position=3)
    dependencies = [
        (
            PullRequestDependency(
                project_id=project_id,
                pull_request_id=blocked_pr.id,
                blocked_by_pull_request_id=active_blocker.id,
            ),
            active_blocker,
        ),
        (
            PullRequestDependency(
                project_id=project_id,
                pull_request_id=unblocked_pr.id,
                blocked_by_pull_request_id=merged_blocker.id,
            ),
            merged_blocker,
        ),
    ]
    session = Mock()
    session.execute = AsyncMock(
        side_effect=[
            _scalars_result([active_blocker, blocked_pr, merged_blocker, unblocked_pr]),
            _rows_result(dependencies),
            _rows_result([]),
        ]
    )

    queue = await list_project_pull_requests(session, project_id)

    assert queue[1].ready is False
    assert [item.github_number for item in queue[1].blocked_by] == [41]
    assert queue[3].ready is True
    assert queue[3].blocked_by == []


@pytest.mark.asyncio
async def test_reorder_updates_entire_open_queue() -> None:
    project_id = uuid.uuid4()
    first = _pull_request(project_id, 41)
    second = _pull_request(project_id, 42, position=1)
    session = Mock()
    session.execute = AsyncMock(
        side_effect=[
            _scalars_result([first, second]),
            _scalars_result([second, first]),
            _rows_result([]),
            _rows_result([]),
        ]
    )
    session.flush = AsyncMock()

    await reorder_project_pull_requests(session, project_id, [42, 41])

    assert second.queue_position == 0
    assert first.queue_position == 1
    session.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_reorder_rejects_an_incomplete_open_queue() -> None:
    project_id = uuid.uuid4()
    session = Mock()
    session.execute = AsyncMock(
        return_value=_scalars_result(
            [_pull_request(project_id, 41), _pull_request(project_id, 42, position=1)]
        )
    )
    session.flush = AsyncMock()

    with pytest.raises(HTTPException, match="every open pull request exactly once") as error:
        await reorder_project_pull_requests(session, project_id, [41])

    assert error.value.status_code == 400
    session.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_dependency_add_and_remove() -> None:
    project_id = uuid.uuid4()
    pull_request = _pull_request(project_id, 41)
    blocker = _pull_request(project_id, 42, position=1)
    dependency = PullRequestDependency(
        project_id=project_id,
        pull_request_id=pull_request.id,
        blocked_by_pull_request_id=blocker.id,
    )
    add_session = Mock()
    add_session.execute = AsyncMock(
        side_effect=[
            _scalar_result(pull_request),
            _scalar_result(blocker),
            _scalars_result([]),
            _scalars_result([pull_request, blocker]),
            _rows_result([]),
            _rows_result([]),
        ]
    )
    add_session.add = Mock()
    add_session.flush = AsyncMock()

    await add_pull_request_dependency(add_session, project_id, 41, 42)

    added_dependency = add_session.add.call_args.args[0]
    assert added_dependency.pull_request_id == pull_request.id
    assert added_dependency.blocked_by_pull_request_id == blocker.id

    remove_session = Mock()
    remove_session.execute = AsyncMock(
        side_effect=[
            _scalar_result(pull_request),
            _scalar_result(blocker),
            _scalar_result(dependency),
            _scalars_result([pull_request, blocker]),
            _rows_result([]),
            _rows_result([]),
        ]
    )
    remove_session.delete = AsyncMock()
    remove_session.flush = AsyncMock()

    await remove_pull_request_dependency(remove_session, project_id, 41, 42)

    remove_session.delete.assert_awaited_once_with(dependency)


@pytest.mark.asyncio
async def test_dependency_cycle_is_rejected_with_clear_error() -> None:
    project_id = uuid.uuid4()
    pull_request = _pull_request(project_id, 41)
    blocker = _pull_request(project_id, 42)
    third = _pull_request(project_id, 43)
    dependencies = [
        Mock(pull_request_id=blocker.id, blocked_by_pull_request_id=third.id),
        Mock(pull_request_id=third.id, blocked_by_pull_request_id=pull_request.id),
    ]
    session = Mock()
    session.execute = AsyncMock(
        side_effect=[
            _scalar_result(pull_request),
            _scalar_result(blocker),
            _scalars_result(dependencies),
        ]
    )
    session.add = Mock()
    session.flush = AsyncMock()

    with pytest.raises(
        HTTPException, match="Dependency would create a pull request cycle"
    ) as error:
        await add_pull_request_dependency(session, project_id, 41, 42)

    assert error.value.status_code == 400
    session.add.assert_not_called()
    session.flush.assert_not_awaited()


def test_graph_reachability_detects_long_cycles() -> None:
    first, second, third = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    assert _has_path({second: {third}, third: {first}}, second, first)
    assert not _has_path({second: {third}}, second, first)


@pytest.mark.asyncio
async def test_issue_link_rejects_an_issue_from_another_project() -> None:
    project_id = uuid.uuid4()
    pull_request = _pull_request(project_id, 41)
    session = Mock()
    session.execute = AsyncMock(side_effect=[_scalar_result(pull_request), _scalar_result(None)])

    with pytest.raises(HTTPException, match="Issue not found in this project") as error:
        await link_pull_request_issue(session, project_id, 41, uuid.uuid4())

    assert error.value.status_code == 404
    assert session.add.call_count == 0
