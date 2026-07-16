import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DBSession
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import get_user_by_id, list_all_users, update_user_profile

router = APIRouter()


@router.get("", response_model=list[UserRead])
async def list_users(session: DBSession, current_user: CurrentUser):
    """List all active team members (authenticated)."""
    return await list_all_users(session)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(session: DBSession, user_id: uuid.UUID, current_user: CurrentUser):
    """Retrieve user details by ID."""
    return await get_user_by_id(session, user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    session: DBSession,
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: CurrentUser,
):
    """Update user profile (only self-update allowed)."""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile",
        )
    return await update_user_profile(session, user_id, data)
