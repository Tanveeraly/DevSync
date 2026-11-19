"""GitHub REST API service — fetches live repo stats using a PAT."""

from __future__ import annotations

import asyncio
import os
import re
from datetime import UTC, date, datetime, timedelta
from typing import Any

import httpx

from app.core.config import settings
from app.services.github_auth_service import normalize_github_repository

GITHUB_API = "https://api.github.com"
GITHUB_API_VERSION = "2026-03-10"


class GitHubRateLimitError(Exception):
    """GitHub rate limit response with the earliest safe retry delay, if known."""

    def __init__(self, retry_after: int | None) -> None:
        self.retry_after = retry_after
        super().__init__("GitHub API rate limit exceeded")


class GitHubAPIError(Exception):
    """A non-rate-limit error response from GitHub."""

    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        super().__init__(f"GitHub API returned status {status_code}")


def _rate_limit_retry_after(response: httpx.Response) -> int | None:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return max(0, int(retry_after))
        except ValueError:
            pass

    reset_at = response.headers.get("X-RateLimit-Reset")
    if reset_at and response.headers.get("X-RateLimit-Remaining") == "0":
        try:
            return max(0, int(reset_at) - int(datetime.now(UTC).timestamp()))
        except ValueError:
            pass
    return None


def _raise_for_github_error(response: httpx.Response) -> None:
    if response.status_code in (403, 429):
        try:
            body = (
                response.json()
                if response.headers.get("content-type", "").startswith("application/json")
                else {}
            )
        except ValueError:
            body = {}
        message = body.get("message", "") if isinstance(body, dict) else ""
        is_rate_limited = (
            response.status_code == 429
            or response.headers.get("Retry-After") is not None
            or response.headers.get("X-RateLimit-Remaining") == "0"
            or "rate limit" in str(message).lower()
        )
        if is_rate_limited:
            raise GitHubRateLimitError(_rate_limit_retry_after(response))

    if response.is_error:
        raise GitHubAPIError(response.status_code)


async def _get_all_pages(
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
    *,
    params: dict[str, str | int] | None = None,
    result_key: str | None = None,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    next_url: str | None = url
    next_params = params
    while next_url:
        page_url = httpx.URL(next_url)
        if (
            page_url.scheme != "https"
            or page_url.host != "api.github.com"
            or page_url.port not in (None, 443)
        ):
            raise GitHubAPIError(502)
        response = await client.get(next_url, headers=headers, params=next_params)
        _raise_for_github_error(response)
        try:
            payload = response.json()
        except ValueError as exc:
            raise GitHubAPIError(response.status_code) from exc
        if result_key is not None:
            payload = payload.get(result_key) if isinstance(payload, dict) else None
        if not isinstance(payload, list) or any(not isinstance(item, dict) for item in payload):
            raise GitHubAPIError(response.status_code)
        items.extend(payload)
        next_page = response.links.get("next")
        next_url = next_page["url"] if next_page else None
        next_params = None
    return items


def _parse_github_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _summarize_reviews(reviews: list[dict[str, Any]]) -> str:
    latest_by_reviewer: dict[str, str] = {}
    for review in reviews:
        user = review.get("user")
        login = user.get("login") if isinstance(user, dict) else None
        state = review.get("state")
        if isinstance(login, str) and isinstance(state, str):
            latest_by_reviewer[login] = state.upper()

    states = latest_by_reviewer.values()
    if "CHANGES_REQUESTED" in states:
        return "changes_requested"
    if "APPROVED" in states:
        return "approved"
    return "review_required"


def _summarize_checks(check_runs: list[dict[str, Any]]) -> str:
    if not check_runs:
        return "none"
    if any(
        run.get("conclusion") in {"failure", "action_required", "timed_out"}
        for run in check_runs
    ):
        return "failure"
    if any(
        run.get("status") in {"queued", "in_progress", "waiting", "requested", "pending"}
        for run in check_runs
    ):
        return "pending"
    return "success"


async def fetch_open_pull_requests(
    github_repo_url: str,
    token: str,
) -> list[dict[str, Any]]:
    """Fetch all open PRs and read-only review/check summaries for a repository."""
    if not token.strip():
        raise ValueError("A linked GitHub access token is required")
    token = token.strip()
    repository = normalize_github_repository(github_repo_url)
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        pull_requests = await _get_all_pages(
            client,
            f"{GITHUB_API}/repos/{repository}/pulls",
            headers,
            params={"state": "open", "per_page": 100},
        )
        async def fetch_summaries(pr: dict[str, Any]) -> dict[str, Any]:
            number = pr.get("number")
            head = pr.get("head")
            head_sha = head.get("sha") if isinstance(head, dict) else None
            if not isinstance(number, int) or not isinstance(head_sha, str):
                raise GitHubAPIError(200)
            head_branch = head.get("ref") if isinstance(head, dict) else None
            url = pr.get("html_url")
            title = pr.get("title")
            state = pr.get("state")
            is_draft = pr.get("draft", False)
            if (
                not isinstance(url, str)
                or not isinstance(title, str)
                or state != "open"
                or not isinstance(is_draft, bool)
            ):
                raise GitHubAPIError(200)
            reviews, check_runs = await asyncio.gather(
                _get_all_pages(
                    client,
                    f"{GITHUB_API}/repos/{repository}/pulls/{number}/reviews",
                    headers,
                    params={"per_page": 100},
                ),
                _get_all_pages(
                    client,
                    f"{GITHUB_API}/repos/{repository}/commits/{head_sha}/check-runs",
                    headers,
                    params={"per_page": 100},
                    result_key="check_runs",
                ),
            )
            return {
                "number": number,
                "url": url,
                "title": title,
                "head_branch": head_branch,
                "state": state,
                "is_draft": is_draft,
                "check_summary": _summarize_checks(check_runs),
                "review_summary": _summarize_reviews(reviews),
                "github_updated_at": _parse_github_datetime(pr.get("updated_at")),
                "merged_at": _parse_github_datetime(pr.get("merged_at")),
            }

        snapshots: list[dict[str, Any]] = []
        for offset in range(0, len(pull_requests), 5):
            batch = await asyncio.gather(
                *(fetch_summaries(pr) for pr in pull_requests[offset : offset + 5]),
                return_exceptions=True,
            )
            for item in batch:
                if isinstance(item, BaseException):
                    raise item
                snapshots.append(item)
        return snapshots


def _parse_repo(github_repo_url: str | None) -> str | None:
    """Extract 'owner/repo' from a full GitHub URL or a bare 'owner/repo' string."""
    if not github_repo_url:
        return None
    url = github_repo_url.strip().rstrip("/")
    if not url:
        return None
    # Already bare owner/repo
    if re.match(r"^[\w.\-]+/[\w.\-]+$", url):
        return url
    # Full URL: https://github.com/owner/repo or http://github.com/owner/repo
    m = re.search(r"github\.com/([^/]+/[^/?\#]+?)(?:\.git)?(?:[/?#]|$)", url, re.IGNORECASE)
    if m:
        return m.group(1)
    return url


def _get_pat() -> str:
    """Get GitHub Personal Access Token from settings or environment."""
    pat = getattr(settings, "GITHUB_PAT", "") or os.getenv("GITHUB_PAT", "")
    return pat.strip()


def _auth_headers(pat: str | None = None) -> dict[str, str]:
    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = pat or _get_pat()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def get_github_stats(
    github_repo_url: str | None,
    pat: str | None = None,
) -> dict[str, Any]:
    """
    Fetch live GitHub stats for a repository.

    Returns dict containing:
      - repo_name: str
      - repo_url: str
      - commits_by_day: list[{day, commits, prs, issuesClosed}]
      - contributors: list[{name, commits, prs, reviews, avatarUrl}]
      - recent_commits: list[{sha, message, author, date, url, avatar_url}]
      - recent_prs: list[{title, number, url, state, author, created_at, merged_at}]
      - open_issues_count: int
      - open_prs_count: int
      - error: str | None
    """
    repo = _parse_repo(github_repo_url)

    if not repo:
        return _empty_stats("No GitHub repository URL set on this project. Click 'Link GitHub Repo' to connect.")

    if pat is None:
        pat = _get_pat()
    if not pat:
        return _empty_stats("GitHub account is not linked. Link your GitHub account in Settings.")

    headers = _auth_headers(pat)

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        try:
            # ── 1. Repo meta ──────────────────────────────────────────────
            r_repo = await client.get(f"{GITHUB_API}/repos/{repo}", headers=headers)
            if r_repo.status_code == 404:
                return _empty_stats(f"Repository '{repo}' not found or not accessible with provided token.")
            if r_repo.status_code == 401:
                return _empty_stats("GitHub PAT is invalid or unauthorized.")
            r_repo.raise_for_status()
            repo_data = r_repo.json()

            # ── 2. Commits (fetch up to 100 recent commits) ───────────────
            r_commits = await client.get(
                f"{GITHUB_API}/repos/{repo}/commits",
                headers=headers,
                params={"per_page": 100},
            )
            commits_raw = r_commits.json() if r_commits.is_success and isinstance(r_commits.json(), list) else []

            # ── 3. Pull Requests (fetch up to 30 recent PRs) ──────────────
            r_prs = await client.get(
                f"{GITHUB_API}/repos/{repo}/pulls",
                headers=headers,
                params={"state": "all", "sort": "updated", "per_page": 30},
            )
            prs_raw = r_prs.json() if r_prs.is_success and isinstance(r_prs.json(), list) else []

            # ── 4. Contributors ───────────────────────────────────────────
            r_contrib = await client.get(
                f"{GITHUB_API}/repos/{repo}/contributors",
                headers=headers,
                params={"per_page": 20},
            )
            contrib_raw = r_contrib.json() if r_contrib.is_success and isinstance(r_contrib.json(), list) else []

        except httpx.RequestError as exc:
            return _empty_stats(f"Network error connecting to GitHub API: {exc}")

    # ── Map Commits by Day ────────────────────────────────────────────────
    today = datetime.now(UTC).date()

    # Collect all activity dates from commits and PRs
    activity_dates: list[date] = []
    for c in commits_raw:
        try:
            if isinstance(c, dict) and "commit" in c and "author" in c["commit"]:
                date_str = c["commit"]["author"]["date"][:10]
                activity_dates.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        except (KeyError, TypeError, ValueError):
            pass

    for pr in prs_raw:
        try:
            if isinstance(pr, dict) and pr.get("created_at"):
                date_str = pr["created_at"][:10]
                activity_dates.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        except (KeyError, TypeError, ValueError):
            pass

    # Determine end date of 7-day window: if activity in last 7 days, use today; otherwise anchor to most recent activity
    latest_activity = max(activity_dates) if activity_dates else today
    end_date = today if (today - latest_activity).days <= 6 else latest_activity

    day_map: dict[str, dict[str, Any]] = {}
    for i in range(6, -1, -1):
        d = end_date - timedelta(days=i)
        label = d.strftime("%a")
        day_map[d.isoformat()] = {"day": label, "date": d.isoformat(), "commits": 0, "prs": 0, "issuesClosed": 0}

    for c in commits_raw:
        try:
            if isinstance(c, dict) and "commit" in c and "author" in c["commit"]:
                date_str = c["commit"]["author"]["date"][:10]
                if date_str in day_map:
                    day_map[date_str]["commits"] += 1
        except (KeyError, TypeError, ValueError):
            pass

    for pr in prs_raw:
        try:
            if isinstance(pr, dict):
                merged_at = pr.get("merged_at")
                created_at = pr.get("created_at")
                if merged_at and merged_at[:10] in day_map:
                    day_map[merged_at[:10]]["prs"] += 1
                    day_map[merged_at[:10]]["issuesClosed"] += 1
                elif created_at and created_at[:10] in day_map:
                    day_map[created_at[:10]]["prs"] += 1
        except (KeyError, TypeError):
            pass

    # Sort days chronologically
    commits_by_day = sorted(day_map.values(), key=lambda x: x["date"])

    # ── Contributors List ─────────────────────────────────────────────────
    contributors = []
    if isinstance(contrib_raw, list):
        for c in contrib_raw[:10]:
            if isinstance(c, dict) and c.get("type") != "Anonymous":
                login = c.get("login", "Unknown")
                pr_count = sum(
                    1 for p in prs_raw 
                    if isinstance(p, dict) and p.get("user", {}).get("login") == login
                )
                contributors.append({
                    "name": login,
                    "commits": c.get("contributions", 0),
                    "prs": pr_count,
                    "reviews": 0,
                    "avatarUrl": c.get("avatar_url", ""),
                    "url": c.get("html_url", ""),
                })

    # ── Recent Commits List ───────────────────────────────────────────────
    recent_commits = []
    for c in commits_raw[:15]:
        if not isinstance(c, dict):
            continue
        commit_info = c.get("commit", {})
        author_info = commit_info.get("author", {})
        github_user = c.get("author") or {}
        recent_commits.append({
            "sha": c.get("sha", "")[:7],
            "message": commit_info.get("message", "").split("\n")[0],
            "author": author_info.get("name") or github_user.get("login", "Developer"),
            "date": author_info.get("date", ""),
            "url": c.get("html_url", ""),
            "avatarUrl": github_user.get("avatar_url", ""),
        })

    # ── Recent PRs List ───────────────────────────────────────────────────
    recent_prs = []
    for pr in prs_raw[:10]:
        if not isinstance(pr, dict):
            continue
        recent_prs.append({
            "title": pr.get("title", ""),
            "number": pr.get("number"),
            "url": pr.get("html_url", ""),
            "state": "merged" if pr.get("merged_at") else pr.get("state", "open"),
            "author": pr.get("user", {}).get("login", ""),
            "created_at": pr.get("created_at", ""),
            "merged_at": pr.get("merged_at"),
        })

    open_prs = sum(1 for p in prs_raw if isinstance(p, dict) and p.get("state") == "open")

    return {
        "repo_name": repo_data.get("full_name", repo),
        "repo_url": repo_data.get("html_url", ""),
        "description": repo_data.get("description", ""),
        "stars": repo_data.get("stargazers_count", 0),
        "forks": repo_data.get("forks_count", 0),
        "open_issues_count": repo_data.get("open_issues_count", 0),
        "open_prs_count": open_prs,
        "commits_by_day": commits_by_day,
        "contributors": contributors,
        "recent_commits": recent_commits,
        "recent_prs": recent_prs,
        "error": None,
    }


def _empty_stats(error: str) -> dict[str, Any]:
    today = datetime.now(UTC).date()
    days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        days.append({"day": d.strftime("%a"), "date": d.isoformat(), "commits": 0, "prs": 0, "issuesClosed": 0})
    return {
        "repo_name": "",
        "repo_url": "",
        "description": "",
        "stars": 0,
        "forks": 0,
        "open_issues_count": 0,
        "open_prs_count": 0,
        "commits_by_day": days,
        "contributors": [],
        "recent_commits": [],
        "recent_prs": [],
        "error": error,
    }
