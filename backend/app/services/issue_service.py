import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.board import Board, Column
from app.models.issue import Issue, IssueStatus
from app.schemas.issue import IssueCreate, IssueUpdate


async def create_issue(
    session: AsyncSession, project_id: uuid.UUID, reporter_id: uuid.UUID, data: IssueCreate
) -> Issue:
    # Resolve default column if not provided
    column_id = None
    board_stmt = select(Board).where(Board.project_id == project_id).limit(1)
    board_res = await session.execute(board_stmt)
    board = board_res.scalar_one_or_none()
    if not board:
        from app.schemas.board import BoardCreate
        from app.services.board_service import create_board
        board = await create_board(session, project_id, BoardCreate(name="Development Board"))

    if board and board.columns:
        # Find column matching status or fallback to first
        target_status = data.status.value.lower()
        matched_col = None
        for col in board.columns:
            col_slug = col.name.lower().replace(" ", "_")
            if col_slug == target_status or (target_status == "todo" and col_slug == "todo") or (target_status in col_slug):
                matched_col = col
                break
        column_id = matched_col.id if matched_col else board.columns[0].id
            
    # Calculate position
    position = 0
    if column_id:
        pos_stmt = select(func.max(Issue.position)).where(Issue.column_id == column_id)
        pos_res = await session.execute(pos_stmt)
        max_pos = pos_res.scalar()
        if max_pos is not None:
            position = max_pos + 1
            
    issue = Issue(
        project_id=project_id,
        reporter_id=reporter_id,
        column_id=column_id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        assignee_id=data.assignee_id,
        position=position,
        version=1,
        branch_name=data.branch_name,
        pr_url=data.pr_url,
        labels=data.labels,
    )
    session.add(issue)
    await session.flush()
    await session.refresh(issue)
    return issue


async def get_issue_by_id(session: AsyncSession, issue_id: uuid.UUID) -> Issue:
    result = await session.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found",
        )
    return issue


async def list_project_issues(
    session: AsyncSession, project_id: uuid.UUID, status_filter: IssueStatus | None = None
) -> list[Issue]:
    stmt = select(Issue).where(Issue.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Issue.status == status_filter)
    stmt = stmt.order_by(Issue.position)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_issue(session: AsyncSession, issue_id: uuid.UUID, data: IssueUpdate) -> Issue:
    issue = await get_issue_by_id(session, issue_id)
    
    # ── Optimistic Locking Check ──
    if issue.version != data.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Issue has been updated by another user. Local version: {data.version}, Server version: {issue.version}",
        )
        
    if data.title is not None:
        issue.title = data.title
    if data.description is not None:
        issue.description = data.description
    if data.status is not None:
        issue.status = data.status
    if data.priority is not None:
        issue.priority = data.priority
    if data.assignee_id is not None:
        issue.assignee_id = data.assignee_id
    if data.branch_name is not None:
        issue.branch_name = data.branch_name
    if data.pr_url is not None:
        issue.pr_url = data.pr_url
    if data.labels is not None:
        issue.labels = data.labels
        
    # If column_id is explicitly changing via normal update
    if data.column_id is not None and data.column_id != issue.column_id:
        issue.column_id = data.column_id
        # Align status if moving columns
        col_res = await session.execute(select(Column).where(Column.id == data.column_id))
        col = col_res.scalar_one_or_none()
        if col:
            name_lower = col.name.lower().replace(" ", "_")
            for enum_val in IssueStatus:
                if enum_val.value == name_lower:
                    issue.status = enum_val
                    break

    # Increment version
    issue.version += 1
    await session.flush()
    await session.refresh(issue)
    return issue


async def move_issue_position(
    session: AsyncSession,
    issue_id: uuid.UUID,
    column_id: uuid.UUID | None,
    position: int,
    expected_version: int,
) -> Issue:
    issue = await get_issue_by_id(session, issue_id)
    
    # ── Optimistic Locking Check ──
    if issue.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Issue has been updated by another user. Local version: {expected_version}, Server version: {issue.version}",
        )
        
    old_column_id = issue.column_id
    issue.column_id = column_id
    issue.position = position
    
    # If the column changed, auto-update the status to match
    if column_id and column_id != old_column_id:
        col_res = await session.execute(select(Column).where(Column.id == column_id))
        col = col_res.scalar_one_or_none()
        if col:
            name_lower = col.name.lower().replace(" ", "_")
            if "backlog" in name_lower:
                issue.status = IssueStatus.BACKLOG
            elif "todo" in name_lower:
                issue.status = IssueStatus.TODO
            elif "progress" in name_lower:
                issue.status = IssueStatus.IN_PROGRESS
            elif "review" in name_lower:
                issue.status = IssueStatus.REVIEW
            elif "done" in name_lower:
                issue.status = IssueStatus.DONE

    # Increment version
    issue.version += 1
    await session.flush()
    await session.refresh(issue)
    return issue


async def delete_issue(session: AsyncSession, issue_id: uuid.UUID) -> None:
    issue = await get_issue_by_id(session, issue_id)
    await session.delete(issue)
    await session.flush()
