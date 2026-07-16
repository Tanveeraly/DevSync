from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DBSession
from app.core.security import create_access_token, create_refresh_token
from app.schemas.auth import RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, refresh_tokens, register_user

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
):
    """Log in using username/email and password (form-data)."""
    user = await authenticate_user(session, form_data.username, form_data.password)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(session: DBSession, data: RefreshRequest):
    """Obtain a new access/refresh token pair using a valid refresh token."""
    return await refresh_tokens(session, data.refresh_token)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser):
    """Retrieve the profile of the currently logged-in user."""
    return current_user
