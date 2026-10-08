"""GitHub REST API service — fetches live repo stats using a PAT."""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

GITHUB_API = "https://api.github.com"


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
    today = datetime.now(timezone.utc).date()

    # Collect all activity dates from commits and PRs
    activity_dates: list[datetime.date] = []
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

    day_map: dict[str, dict] = {}
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
    today = datetime.now(timezone.utc).date()
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
