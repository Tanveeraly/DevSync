from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DBSession
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.schemas.auth import (
    ForgotPasswordRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services.auth_service import (
    authenticate_user,
    refresh_tokens,
    register_user,
    request_password_reset,
    reset_password,
)

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(session: DBSession, data: RegisterRequest):
    """Register a new user account."""
    user = await register_user(session, data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    session: DBSession,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
):
    """Log in using username/email and password (form-data)."""
    user = await authenticate_user(session, form_data.username, form_data.password)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        access_token,
        httponly=True,
        samesite="lax",
        secure=settings.AUTH_COOKIE_SECURE,
        max_age=60 * 60,
        path="/",
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(session: DBSession, data: RefreshRequest, response: Response):
    """Obtain a new access/refresh token pair using a valid refresh token."""
    tokens = await refresh_tokens(session, data.refresh_token)
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        tokens.access_token,
        httponly=True,
        samesite="lax",
        secure=settings.AUTH_COOKIE_SECURE,
        max_age=60 * 60,
        path="/",
    )
    return tokens


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser):
    """Retrieve the profile of the currently logged-in user."""
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(session: DBSession, data: ForgotPasswordRequest):
    """Request a password-reset link.

    Always returns the same response regardless of whether the email exists
    to prevent user-enumeration attacks.
    """
    await request_password_reset(session, data.email)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password_endpoint(session: DBSession, data: ResetPasswordRequest):
    """Set a new password using a valid reset token."""
    await reset_password(session, data.token, data.new_password)
    return {"message": "Password updated successfully. You can now log in with your new password."}
