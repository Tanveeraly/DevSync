from datetime import UTC, datetime

import httpx
import pytest

from app.services import github_service
from app.services.github_service import (
    GitHubAPIError,
    GitHubRateLimitError,
    fetch_open_pull_requests,
)


@pytest.mark.asyncio
async def test_fetch_open_pull_requests_follows_pages_and_summarizes_reviews_and_checks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        path = request.url.path
        if path.endswith("/pulls") and request.url.params.get("page", "1") == "1":
            return httpx.Response(
                200,
                json=[
                    {
                        "number": 41,
                        "html_url": "https://github.com/acme/app/pull/41",
                        "title": "First PR",
                        "head": {"ref": "feature/one", "sha": "sha-one"},
                        "state": "open",
                        "draft": False,
                        "updated_at": "2026-11-17T10:00:00Z",
                        "merged_at": None,
                    }
                ],
                headers={
                    "Link": (
                        "<https://api.github.com/repos/acme/app/pulls?state=open&per_page=100&page=2>; "
                        'rel="next"'
                    )
                },
            )
        if path.endswith("/pulls") and request.url.params.get("page") == "2":
            return httpx.Response(
                200,
                json=[
                    {
                        "number": 42,
                        "html_url": "https://github.com/acme/app/pull/42",
                        "title": "Second PR",
                        "head": {"ref": "feature/two", "sha": "sha-two"},
                        "state": "open",
                        "draft": True,
                        "updated_at": "2026-11-17T11:00:00Z",
                        "merged_at": None,
                    }
                ],
            )
        if path.endswith("/pulls/41/reviews"):
            return httpx.Response(
                200,
                json=[{"user": {"login": "reviewer"}, "state": "APPROVED"}],
            )
        if path.endswith("/pulls/42/reviews"):
            return httpx.Response(200, json=[])
        if path.endswith("/commits/sha-one/check-runs"):
            return httpx.Response(
                200,
                json={
                    "total_count": 1,
                    "check_runs": [{"status": "completed", "conclusion": "failure"}],
                },
            )
        if path.endswith("/commits/sha-two/check-runs"):
            return httpx.Response(
                200,
                json={
                    "total_count": 1,
                    "check_runs": [{"status": "in_progress", "conclusion": None}],
                },
            )
        raise AssertionError(f"Unexpected GitHub request: {request.url}")

    original_client = httpx.AsyncClient

    def mock_client(*args, **kwargs):
        return original_client(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(github_service.httpx, "AsyncClient", mock_client)

    pull_requests = await fetch_open_pull_requests(
        "https://github.com/acme/app.git",
        "linked-user-token",
    )

    assert [pr["number"] for pr in pull_requests] == [41, 42]
    assert pull_requests[0]["check_summary"] == "failure"
    assert pull_requests[0]["review_summary"] == "approved"
    assert pull_requests[0]["github_updated_at"] == datetime(2026, 11, 17, 10, 0, tzinfo=UTC)
    assert pull_requests[1]["check_summary"] == "pending"
    assert pull_requests[1]["review_summary"] == "review_required"
    assert pull_requests[1]["is_draft"] is True
    assert all(
        request.headers["Authorization"] == "Bearer linked-user-token" for request in requests
    )
    assert all(request.headers["X-GitHub-Api-Version"] == "2026-03-10" for request in requests)


@pytest.mark.asyncio
async def test_fetch_open_pull_requests_reports_rate_limit_without_retrying(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            403,
            json={"message": "API rate limit exceeded"},
            headers={"X-RateLimit-Remaining": "0", "Retry-After": "30"},
        )

    original_client = httpx.AsyncClient

    def mock_client(*args, **kwargs):
        return original_client(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(github_service.httpx, "AsyncClient", mock_client)

    with pytest.raises(GitHubRateLimitError) as error:
        await fetch_open_pull_requests("acme/app", "linked-user-token")

    assert error.value.retry_after == 30
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_fetch_open_pull_requests_does_not_send_token_to_untrusted_page_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json=[],
            headers={"Link": '<https://attacker.example/pulls?page=2>; rel="next"'},
        )

    original_client = httpx.AsyncClient

    def mock_client(*args, **kwargs):
        return original_client(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(github_service.httpx, "AsyncClient", mock_client)

    with pytest.raises(GitHubAPIError):
        await fetch_open_pull_requests("acme/app", "linked-user-token")

    assert len(requests) == 1
