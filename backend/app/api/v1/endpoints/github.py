from typing import Annotated
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DBSession, CurrentUser
from app.core.config import settings
from app.core.database import get_async_session
from app.models.github_token import GitHubToken
from app.models.user import User
from app.services.github_auth_service import (
    create_github_state,
    get_github_repositories,
    get_linked_github_token,
    link_github_account,
    unlink_github_account,
    validate_token,
)

router = APIRouter()


@router.get("/github/login")
async def github_login(current_user: CurrentUser) -> RedirectResponse:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth is not configured")
    state = create_github_state(current_user.id)
    query = urlencode(
        {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "state": state,
            "scope": "repo read:user user:email",
        }
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{query}")


@router.get("/github/callback")
async def github_callback(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
) -> RedirectResponse:
    frontend_url = f"{settings.FRONTEND_URL}/settings"
    if not code or not state:
        return RedirectResponse(f"{frontend_url}?github=error")
    try:
        payload = validate_token(state)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing GitHub OAuth user")
        user = await session.get(User, UUID(user_id))
        if user is None:
            raise ValueError("GitHub OAuth user no longer exists")
        await link_github_account(session, user, code, state)
        await session.commit()
    except Exception:
        return RedirectResponse(f"{frontend_url}?github=error")
    return RedirectResponse(f"{frontend_url}?github=connected")


@router.get("/github/repositories")
async def github_repositories(current_user: CurrentUser, session: DBSession) -> list[dict[str, object]]:
    token = await get_linked_github_token(session, current_user.id)
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GitHub account is not linked")
    return await get_github_repositories(token)


@router.delete("/github")
async def github_disconnect(current_user: CurrentUser, session: DBSession) -> None:
    await unlink_github_account(session, current_user.id)
    await session.commit()


@router.get("/github/status")
async def github_status(current_user: CurrentUser, session: DBSession) -> dict[str, object]:
    result = await session.execute(select(GitHubToken).where(GitHubToken.user_id == current_user.id))
    return {"linked": result.scalar_one_or_none() is not None}
