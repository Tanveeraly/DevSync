"""GitHub OAuth account linking and repository discovery."""

from __future__ import annotations

from datetime import timedelta
from uuid import UUID

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_token, decrypt_token, encrypt_token, validate_token
from app.models.github_token import GitHubToken
from app.models.user import User

GITHUB_API = "https://api.github.com"
GITHUB_OAUTH = "https://github.com/login/oauth"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"


def normalize_github_repository(repository: str) -> str:
    """Return a canonical owner/repository value from a GitHub URL or shorthand name."""
    value = repository.strip().rstrip("/")
    if value.startswith("https://github.com/"):
        value = value.removeprefix("https://github.com/")
    elif value.startswith("http://github.com/"):
        value = value.removeprefix("http://github.com/")
    value = value.removesuffix(".git")
    parts = value.split("/")
    if len(parts) != 2 or not all(part and part.replace("-", "").replace("_", "").replace(".", "").isalnum() for part in parts):
        raise ValueError("Enter a valid GitHub repository as owner/repository")
    return f"{parts[0]}/{parts[1]}"


def validate_github_token(token: str) -> None:
    if not token or not token.strip():
        raise ValueError("GitHub access token is required")


def create_github_state(user_id: UUID) -> str:
    return create_token(
        {"sub": str(user_id), "type": "github-oauth-state"},
        expires_delta=timedelta(minutes=10),
    )


def verify_github_state(state: str, user_id: UUID) -> None:
    payload = validate_token(state)
    if payload.get("type") != "github-oauth-state" or payload.get("sub") != str(user_id):
        raise ValueError("Invalid GitHub OAuth state")


async def exchange_github_code(code: str, client_id: str, client_secret: str) -> dict[str, object]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if "access_token" not in payload or payload.get("error"):
            raise ValueError(payload.get("error_description") or "GitHub did not return an access token")
        return payload


async def get_github_user(token: str) -> dict[str, object]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API}/user",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
        response.raise_for_status()
        return response.json()


async def get_github_repositories(token: str) -> list[dict[str, object]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API}/user/repos",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"per_page": 100, "sort": "updated", "direction": "desc"},
        )
        response.raise_for_status()
        repositories = response.json()
        if not isinstance(repositories, list):
            raise ValueError("GitHub returned an invalid repository list")
        return repositories


async def link_github_account(
    session: AsyncSession,
    user: User,
    code: str,
    state: str,
) -> dict[str, object]:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise ValueError("GitHub OAuth is not configured")

    payload = validate_token(state)
    if payload.get("type") != "github-oauth-state" or payload.get("sub") != str(user.id):
        raise ValueError("Invalid GitHub OAuth state")

    token_data = await exchange_github_code(code, settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET)
    access_token = str(token_data["access_token"])
    github_user = await get_github_user(access_token)

    result = await session.execute(select(GitHubToken).where(GitHubToken.user_id == user.id))
    github_token = result.scalar_one_or_none()
    encrypted_token = encrypt_token(access_token)
    if github_token:
        github_token.access_token = encrypted_token
        github_token.refresh_token = None
        github_token.token_type = "bearer"
        github_token.scope = str(token_data.get("scope") or "")
    else:
        github_token = GitHubToken(
            user_id=user.id,
            access_token=encrypted_token,
            token_type="bearer",
            scope=str(token_data.get("scope") or ""),
        )
        session.add(github_token)

    user.github_id = int(github_user["id"])
    user.avatar_url = str(github_user.get("avatar_url") or None)
    user.full_name = str(github_user.get("name") or github_user.get("login") or None)
    await session.flush()
    return {
        "github_id": user.github_id,
        "login": github_user.get("login"),
        "name": github_user.get("name"),
        "avatar_url": github_user.get("avatar_url"),
    }


async def unlink_github_account(session: AsyncSession, user_id: UUID) -> None:
    await session.execute(delete(GitHubToken).where(GitHubToken.user_id == user_id))
    user = await session.get(User, user_id)
    if user:
        user.github_id = None
        user.avatar_url = None
        user.full_name = None


async def get_linked_github_token(session: AsyncSession, user_id: UUID) -> str | None:
    result = await session.execute(select(GitHubToken).where(GitHubToken.user_id == user_id))
    token = result.scalar_one_or_none()
    if token is None:
        return None
    return decrypt_token(token.access_token)
