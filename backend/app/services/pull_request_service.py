"""Persistence and queue rules for project pull requests."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.models.pull_request import PullRequest, PullRequestDependency, PullRequestIssueLink
from app.schemas.pull_request import PullRequestRead


def _has_path(
    graph: dict[uuid.UUID, set[uuid.UUID]],
    start: uuid.UUID,
    destination: uuid.UUID,
) -> bool:
    pending = [start]
    visited: set[uuid.UUID] = set()
    while pending:
        current = pending.pop()
        if current == destination:
            return True
        if current in visited:
            continue
        visited.add(current)
        pending.extend(graph.get(current, set()) - visited)
    return False


async def list_project_pull_requests(
    session: AsyncSession, project_id: uuid.UUID
) -> list[PullRequestRead]:
    pull_request_result = await session.execute(
        select(PullRequest)
        .where(PullRequest.project_id == project_id)
        .order_by(
            case((PullRequest.state == "open", 0), else_=1),
            PullRequest.queue_position,
            PullRequest.github_number,
        )
    )
    pull_requests = list(pull_request_result.scalars().all())
    if not pull_requests:
        return []

    dependencies_result = await session.execute(
        select(PullRequestDependency, PullRequest)
        .join(
            PullRequest,
            and_(
                PullRequest.project_id == PullRequestDependency.project_id,
                PullRequest.id == PullRequestDependency.blocked_by_pull_request_id,
            ),
        )
        .where(PullRequestDependency.project_id == project_id)
    )
    blockers_by_pr: dict[uuid.UUID, list[PullRequest]] = defaultdict(list)
    for dependency, blocker in dependencies_result.all():
        if blocker.merged_at is None:
            blockers_by_pr[dependency.pull_request_id].append(blocker)

    links_result = await session.execute(
        select(PullRequestIssueLink, Issue)
        .join(
            Issue,
            and_(
                Issue.project_id == PullRequestIssueLink.project_id,
                Issue.id == PullRequestIssueLink.issue_id,
            ),
        )
        .where(PullRequestIssueLink.project_id == project_id)
    )
    linked_issues = {link.pull_request_id: issue for link, issue in links_result.all()}

    return [
        PullRequestRead(
            id=pull_request.id,
            project_id=pull_request.project_id,
            github_number=pull_request.github_number,
            url=pull_request.url,
            title=pull_request.title,
            head_branch=pull_request.head_branch,
            state=pull_request.state,
            is_draft=pull_request.is_draft,
            check_summary=pull_request.check_summary,
            review_summary=pull_request.review_summary,
            github_updated_at=pull_request.github_updated_at,
            merged_at=pull_request.merged_at,
            last_synced_at=pull_request.last_synced_at,
            queue_position=pull_request.queue_position,
            linked_issue_id=(
                linked_issues[pull_request.id].id if pull_request.id in linked_issues else None
            ),
            linked_issue_title=(
                linked_issues[pull_request.id].title if pull_request.id in linked_issues else None
            ),
            ready=not blockers_by_pr[pull_request.id],
            blocked_by=[
                {
                    "id": blocker.id,
                    "github_number": blocker.github_number,
                    "title": blocker.title,
                    "url": blocker.url,
                }
                for blocker in sorted(
                    blockers_by_pr[pull_request.id],
                    key=lambda item: (item.queue_position, item.github_number),
                )
            ],
        )
        for pull_request in pull_requests
    ]


async def sync_project_pull_requests(
    session: AsyncSession,
    project_id: uuid.UUID,
    snapshots: list[dict[str, Any]],
) -> list[PullRequestRead]:
    existing_result = await session.execute(
        select(PullRequest).where(PullRequest.project_id == project_id)
    )
    existing_pull_requests = list(existing_result.scalars().all())
    existing_by_number = {pr.github_number: pr for pr in existing_pull_requests}
    existing_numbers = set(existing_by_number)
    next_position = (
        max(
            (pr.queue_position for pr in existing_pull_requests if pr.state == "open"),
            default=-1,
        )
        + 1
    )
    now = datetime.now(UTC)
    values: list[dict[str, Any]] = []
    synced_numbers: set[int] = set()

    for snapshot in snapshots:
        number = snapshot.get("number")
        url = snapshot.get("url")
        title = snapshot.get("title")
        state = snapshot.get("state")
        if (
            not isinstance(number, int)
            or not isinstance(url, str)
            or not isinstance(title, str)
            or state != "open"
        ):
            raise ValueError("GitHub returned an invalid open pull request")
        if number in synced_numbers:
            raise ValueError("GitHub returned a duplicate pull request number")
        synced_numbers.add(number)

        values.append(
            {
                "id": uuid.uuid4(),
                "project_id": project_id,
                "github_number": number,
                "url": url,
                "title": title,
                "head_branch": snapshot.get("head_branch"),
                "state": state,
                "is_draft": bool(snapshot.get("is_draft", False)),
                "check_summary": snapshot.get("check_summary"),
                "review_summary": snapshot.get("review_summary"),
                "github_updated_at": snapshot.get("github_updated_at"),
                "merged_at": snapshot.get("merged_at"),
                "last_synced_at": now,
                "queue_position": (
                    existing_by_number[number].queue_position
                    if number in existing_by_number
                    else next_position
                ),
            }
        )
        if number not in existing_numbers:
            existing_numbers.add(number)
            next_position += 1

    if values:
        statement = insert(PullRequest).values(values)
        statement = statement.on_conflict_do_update(
            constraint="uq_pull_request_project_number",
            set_={
                field: getattr(statement.excluded, field)
                for field in (
                    "url",
                    "title",
                    "head_branch",
                    "state",
                    "is_draft",
                    "check_summary",
                    "review_summary",
                    "github_updated_at",
                    "merged_at",
                    "last_synced_at",
                )
            }
            | {"updated_at": func.now()},
        )
        await session.execute(statement)
        await session.flush()
        session.expire_all()

    return await list_project_pull_requests(session, project_id)


async def reorder_project_pull_requests(
    session: AsyncSession, project_id: uuid.UUID, numbers: list[int]
) -> list[PullRequestRead]:
    result = await session.execute(
        select(PullRequest).where(
            PullRequest.project_id == project_id,
            PullRequest.state == "open",
        )
    )
    pull_requests = list(result.scalars().all())
    pull_requests_by_number = {pr.github_number: pr for pr in pull_requests}
    if len(numbers) != len(pull_requests) or set(numbers) != set(pull_requests_by_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain every open pull request exactly once",
        )
    for position, number in enumerate(numbers):
        pull_requests_by_number[number].queue_position = position
    await session.flush()
    return await list_project_pull_requests(session, project_id)


async def _get_project_pull_request(
    session: AsyncSession, project_id: uuid.UUID, github_number: int
) -> PullRequest:
    result = await session.execute(
        select(PullRequest).where(
            PullRequest.project_id == project_id,
            PullRequest.github_number == github_number,
        )
    )
    pull_request = result.scalar_one_or_none()
    if pull_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pull request #{github_number} not found in this project",
        )
    return pull_request


async def add_pull_request_dependency(
    session: AsyncSession,
    project_id: uuid.UUID,
    github_number: int,
    blocked_by_number: int,
) -> list[PullRequestRead]:
    pull_request = await _get_project_pull_request(session, project_id, github_number)
    blocker = await _get_project_pull_request(session, project_id, blocked_by_number)
    if pull_request.id == blocker.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pull request cannot depend on itself",
        )

    dependency_result = await session.execute(
        select(PullRequestDependency).where(PullRequestDependency.project_id == project_id)
    )
    dependencies = list(dependency_result.scalars().all())
    existing_edge = next(
        (
            dependency
            for dependency in dependencies
            if dependency.pull_request_id == pull_request.id
            and dependency.blocked_by_pull_request_id == blocker.id
        ),
        None,
    )
    if existing_edge is not None:
        return await list_project_pull_requests(session, project_id)

    graph: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
    for dependency in dependencies:
        graph[dependency.pull_request_id].add(dependency.blocked_by_pull_request_id)
    if _has_path(graph, blocker.id, pull_request.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependency would create a pull request cycle",
        )

    session.add(
        PullRequestDependency(
            project_id=project_id,
            pull_request_id=pull_request.id,
            blocked_by_pull_request_id=blocker.id,
        )
    )
    await session.flush()
    return await list_project_pull_requests(session, project_id)


async def remove_pull_request_dependency(
    session: AsyncSession,
    project_id: uuid.UUID,
    github_number: int,
    blocked_by_number: int,
) -> list[PullRequestRead]:
    pull_request = await _get_project_pull_request(session, project_id, github_number)
    blocker = await _get_project_pull_request(session, project_id, blocked_by_number)
    result = await session.execute(
        select(PullRequestDependency).where(
            PullRequestDependency.project_id == project_id,
            PullRequestDependency.pull_request_id == pull_request.id,
            PullRequestDependency.blocked_by_pull_request_id == blocker.id,
        )
    )
    dependency = result.scalar_one_or_none()
    if dependency is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pull request dependency not found",
        )
    await session.delete(dependency)
    await session.flush()
    return await list_project_pull_requests(session, project_id)


async def link_pull_request_issue(
    session: AsyncSession,
    project_id: uuid.UUID,
    github_number: int,
    issue_id: uuid.UUID,
) -> list[PullRequestRead]:
    pull_request = await _get_project_pull_request(session, project_id, github_number)
    issue_result = await session.execute(
        select(Issue).where(Issue.id == issue_id, Issue.project_id == project_id)
    )
    issue = issue_result.scalar_one_or_none()
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found in this project",
        )

    link_result = await session.execute(
        select(PullRequestIssueLink).where(
            PullRequestIssueLink.project_id == project_id,
            PullRequestIssueLink.pull_request_id == pull_request.id,
        )
    )
    link = link_result.scalar_one_or_none()
    if link is None:
        session.add(
            PullRequestIssueLink(
                project_id=project_id,
                pull_request_id=pull_request.id,
                issue_id=issue_id,
            )
        )
    else:
        link.issue_id = issue_id
    await session.flush()
    return await list_project_pull_requests(session, project_id)
