import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.board import Board, Column
from app.schemas.board import BoardCreate, ColumnCreate


async def create_board(session: AsyncSession, project_id: uuid.UUID, data: BoardCreate) -> Board:
    # Create the board
    board = Board(
        project_id=project_id,
        name=data.name,
    )
    session.add(board)
    await session.flush()
    
    # Create default columns: backlog, todo, in_progress, review, done
    default_columns = [
        ("Backlog", 0),
        ("Todo", 1),
        ("In Progress", 2),
        ("Review", 3),
        ("Done", 4),
    ]
    
    for name, pos in default_columns:
        col = Column(
            board_id=board.id,
            name=name,
            position=pos,
        )
        session.add(col)
        
    await session.flush()
    # Refresh to load columns relationship
    await session.refresh(board)
    return board


async def get_board_by_id(session: AsyncSession, board_id: uuid.UUID) -> Board:
    result = await session.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )
    return board


async def get_boards_by_project(session: AsyncSession, project_id: uuid.UUID) -> list[Board]:
    result = await session.execute(select(Board).where(Board.project_id == project_id))
    return list(result.scalars().all())


async def create_board_column(session: AsyncSession, board_id: uuid.UUID, data: ColumnCreate) -> Column:
    # Ensure board exists
    await get_board_by_id(session, board_id)
    
    column = Column(
        board_id=board_id,
        name=data.name,
        position=data.position,
    )
    session.add(column)
    await session.flush()
    return column


async def reorder_columns(session: AsyncSession, board_id: uuid.UUID, column_ids: list[uuid.UUID]) -> list[Column]:
    result = await session.execute(select(Column).where(Column.board_id == board_id))
    columns = {col.id: col for col in result.scalars().all()}
    
    # Update positions
    for position, col_id in enumerate(column_ids):
        if col_id in columns:
            columns[col_id].position = position
            
    await session.flush()
    
    # Return updated columns ordered by position
    sorted_cols = sorted(columns.values(), key=lambda c: c.position)
    return sorted_cols
