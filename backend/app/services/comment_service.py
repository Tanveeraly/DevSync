import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment


async def create_comment(
    session: AsyncSession, issue_id: uuid.UUID, user_id: uuid.UUID, content: str
) -> Comment:
    comment = Comment(
        issue_id=issue_id,
        user_id=user_id,
        content=content,
    )
    session.add(comment)
    await session.flush()
    # Refresh to load relationships
    await session.refresh(comment)
    return comment


async def list_issue_comments(session: AsyncSession, issue_id: uuid.UUID) -> list[Comment]:
    result = await session.execute(
        select(Comment)
        .where(Comment.issue_id == issue_id)
        .order_by(Comment.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_comment(session: AsyncSession, comment_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await session.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    if comment.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this comment",
        )
    await session.delete(comment)
    await session.flush()
