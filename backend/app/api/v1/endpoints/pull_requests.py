from typing import Annotated

import httpx
from fastapi import APIRouter, HTTPException, Path, status

from app.api.deps import CurrentUser, DBSession
from app.api.v1.endpoints.projects import check_access
from app.models.project import Project
from app.models.user import User
from app.schemas.pull_request import (
    PullRequestDependencyCreate,
    PullRequestIssueLinkCreate,
    PullRequestRead,
    PullRequestReorder,
)
from app.services.github_auth_service import get_linked_github_token
from app.services.github_service import (
    GitHubAPIError,
    GitHubRateLimitError,
    fetch_open_pull_requests,
)
from app.services.project_service import get_project_by_slug
from app.services.pull_request_service import (
    add_pull_request_dependency,
    link_pull_request_issue,
    list_project_pull_requests,
    remove_pull_request_dependency,
    reorder_project_pull_requests,
    sync_project_pull_requests,
)

router = APIRouter()


async def _get_accessible_project(session: DBSession, slug: str, user: User) -> Project:
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, user.id)
    return project


@router.get(
    "/projects/{slug}/pull-requests",
    response_model=list[PullRequestRead],
)
async def list_pull_requests(
    session: DBSession, slug: str, current_user: CurrentUser
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    return await list_project_pull_requests(session, project.id)


@router.post(
    "/projects/{slug}/pull-requests/sync",
    response_model=list[PullRequestRead],
)
async def sync_pull_requests(
    session: DBSession, slug: str, current_user: CurrentUser
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    if not project.github_repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link a GitHub repository to this project first",
        )
    token = await get_linked_github_token(session, current_user.id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connect your GitHub account before syncing pull requests",
        )
    try:
        snapshots = await fetch_open_pull_requests(project.github_repo_url, token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except GitHubRateLimitError as exc:
        headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after is not None else None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GitHub rate limit exceeded; retry after the indicated delay",
            headers=headers,
        ) from exc
    except (GitHubAPIError, httpx.RequestError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to sync pull requests from GitHub",
        ) from exc
    return await sync_project_pull_requests(session, project.id, snapshots)


@router.patch(
    "/projects/{slug}/pull-requests/order",
    response_model=list[PullRequestRead],
)
async def reorder_pull_requests(
    session: DBSession,
    slug: str,
    data: PullRequestReorder,
    current_user: CurrentUser,
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    return await reorder_project_pull_requests(session, project.id, data.numbers)


@router.post(
    "/projects/{slug}/pull-requests/{pull_number}/dependencies",
    response_model=list[PullRequestRead],
)
async def create_pull_request_dependency(
    session: DBSession,
    slug: str,
    pull_number: Annotated[int, Path(gt=0)],
    data: PullRequestDependencyCreate,
    current_user: CurrentUser,
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    return await add_pull_request_dependency(
        session,
        project.id,
        pull_number,
        data.blocked_by_pull_request_number,
    )


@router.delete(
    "/projects/{slug}/pull-requests/{pull_number}/dependencies/{blocked_by_pull_request_number}",
    response_model=list[PullRequestRead],
)
async def delete_pull_request_dependency(
    session: DBSession,
    slug: str,
    pull_number: Annotated[int, Path(gt=0)],
    blocked_by_pull_request_number: Annotated[int, Path(gt=0)],
    current_user: CurrentUser,
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    return await remove_pull_request_dependency(
        session,
        project.id,
        pull_number,
        blocked_by_pull_request_number,
    )


@router.put(
    "/projects/{slug}/pull-requests/{pull_number}/issue",
    response_model=list[PullRequestRead],
)
async def put_pull_request_issue_link(
    session: DBSession,
    slug: str,
    pull_number: Annotated[int, Path(gt=0)],
    data: PullRequestIssueLinkCreate,
    current_user: CurrentUser,
) -> list[PullRequestRead]:
    project = await _get_accessible_project(session, slug, current_user)
    return await link_pull_request_issue(
        session,
        project.id,
        pull_number,
        data.issue_id,
    )
