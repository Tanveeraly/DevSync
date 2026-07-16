import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.api.v1.endpoints.projects import check_access, get_project_by_slug
from app.schemas.board import BoardCreate, BoardRead
from app.services.board_service import create_board, get_board_by_id, get_boards_by_project

router = APIRouter()


@router.post("/projects/{slug}/boards", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
async def create_new_board(
    session: DBSession, slug: str, data: BoardCreate, current_user: CurrentUser
):
    """Create a new board for a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    return await create_board(session, project.id, data)


@router.get("/projects/{slug}/boards", response_model=list[BoardRead])
async def list_project_boards(session: DBSession, slug: str, current_user: CurrentUser):
    """List all boards for a project."""
    project = await get_project_by_slug(session, slug)
    await check_access(session, project.id, current_user.id)
    return await get_boards_by_project(session, project.id)


@router.get("/boards/{board_id}", response_model=BoardRead)
async def get_board(session: DBSession, board_id: uuid.UUID, current_user: CurrentUser):
    """Get board with columns and issues."""
    board = await get_board_by_id(session, board_id)
    await check_access(session, board.project_id, current_user.id)
    return board
