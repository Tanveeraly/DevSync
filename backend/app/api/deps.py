"""FastAPI dependency functions."""

from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Type alias for dependency injection
DBSession = Annotated[AsyncSession, Depends(get_async_session)]


async def get_current_user(
    session: DBSession,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    auth_cookie: Annotated[str | None, Cookie(alias=settings.AUTH_COOKIE_NAME)] = None,
) -> User:
    """Decode a bearer token or browser session cookie and return the user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    access_token = token or auth_cookie
    if not access_token:
        raise credentials_exception

    try:
        payload = decode_token(access_token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception from None

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
