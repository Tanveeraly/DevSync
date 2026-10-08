from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_password_reset_token,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services.email_service import send_password_reset_email
from app.core.config import settings


async def register_user(session: AsyncSession, data: RegisterRequest) -> User:
    # Check if email exists
    result = await session.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Check if username exists
    result = await session.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    
    # Create new user
    db_user = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
    )
    session.add(db_user)
    await session.flush()  # Populates DB fields like ID without committing if part of an outer transaction
    return db_user


async def authenticate_user(session: AsyncSession, username: str, password: str) -> User:
    # Retrieve user by username or email
    result = await session.execute(
        select(User).where((User.username == username) | (User.email == username))
    )
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    return user


async def refresh_tokens(session: AsyncSession, refresh_token: str) -> TokenResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = decode_token(refresh_token)
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception from None

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
        
    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


async def request_password_reset(session: AsyncSession, email: str) -> None:
    """Generate a password-reset token and e-mail the reset link.

    Always returns without error – even when the email is not found – to
    prevent user-enumeration attacks.
    """
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        # Silent return – don't reveal whether the address exists.
        return

    token = create_password_reset_token(email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    try:
        await send_password_reset_email(email, reset_link)
    except Exception:
        # Log is already emitted inside send_password_reset_email; swallow here
        # so the endpoint always returns a generic success response.
        pass


async def reset_password(session: AsyncSession, token: str, new_password: str) -> None:
    """Verify a password-reset token and update the user's hashed password."""
    try:
        email = verify_password_reset_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or account is inactive",
        )

    user.hashed_password = hash_password(new_password)
    await session.flush()
