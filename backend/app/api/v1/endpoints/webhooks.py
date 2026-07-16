from typing import Any

from fastapi import APIRouter, BackgroundTasks, Request, status
from sqlalchemy import select

from app.api.deps import DBSession
from app.models.board import Column
from app.models.issue import Issue, IssueStatus
from app.models.project import Project
from app.schemas.issue import IssueRead
from app.services.activity_service import log_activity
from app.websockets.manager import manager as ws_manager

router = APIRouter()


async def process_github_pr_merge(session: DBSession, payload: dict[str, Any]) -> None:
    # We only care about closed PRs that were merged
    action = payload.get("action")
    pr = payload.get("pull_request", {})
    merged = pr.get("merged", False)
    
    if action != "closed" or not merged:
        return
        
    pr_url = pr.get("html_url")
    branch_name = pr.get("head", {}).get("ref")
    
    if not pr_url and not branch_name:
        return
        
    # Search for an issue matching the PR URL or branch name
    stmt = select(Issue)
    if pr_url and branch_name:
        stmt = stmt.where((Issue.pr_url == pr_url) | (Issue.branch_name == branch_name))
    elif pr_url:
        stmt = stmt.where(Issue.pr_url == pr_url)
    else:
        stmt = stmt.where(Issue.branch_name == branch_name)
        
    result = await session.execute(stmt)
    issues = result.scalars().all()
    
    for issue in issues:
        # Find the "Done" column of the board this issue belongs to
        if not issue.column_id:
            continue
            
        col_res = await session.execute(select(Column).where(Column.id == issue.column_id))
        current_col = col_res.scalar_one_or_none()
        if not current_col:
            continue
            
        board_id = current_col.board_id
        done_col_res = await session.execute(
            select(Column)
            .where((Column.board_id == board_id) & (Column.name.ilike("%done%")))
            .limit(1)
        )
        done_col = done_col_res.scalar_one_or_none()
        
        # Fallback to the column with the highest position if no column with 'done' in the name
        if not done_col:
            all_cols_res = await session.execute(
                select(Column).where(Column.board_id == board_id).order_by(Column.position.desc())
            )
            cols = all_cols_res.scalars().all()
            if cols:
                done_col = cols[0]
                
        if done_col and issue.column_id != done_col.id:
            old_col_name = current_col.name
            issue.column_id = done_col.id
            issue.status = IssueStatus.DONE
            issue.version += 1
            
            # Log activity
            # Use project owner/system user or a sentinel user ID for webhook actor.
            # Let's use the reporter or assignee id if available, or project owner.
            project_res = await session.execute(select(Project).where(Project.id == issue.project_id))
            project = project_res.scalar_one_or_none()
            actor_id = project.owner_id if project else issue.reporter_id
            
            await log_activity(
                session,
                issue.project_id,
                actor_id,
                action="github_merge",
                entity_type="issue",
                entity_id=str(issue.id),
                details={
                    "title": issue.title,
                    "pr_url": pr_url,
                    "branch_name": branch_name,
                    "from_column": old_col_name,
                    "to_column": done_col.name,
                    "version": issue.version,
                },
            )
            
            # Commit changes so WebSocket broadcast data is correct in DB
            await session.commit()
            
            # Broadcast the move via WebSockets
            issue_data = IssueRead.model_validate(issue).model_dump(mode="json")
            await ws_manager.broadcast(
                str(issue.project_id),
                {
                    "event": "issue_moved",
                    "data": issue_data,
                }
            )


@router.post("/github", status_code=status.HTTP_202_ACCEPTED)
async def github_webhook(request: Request, session: DBSession, background_tasks: BackgroundTasks):
    """Receive GitHub Webhooks and handle Pull Request merges to auto-resolve tasks."""
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored", "reason": "invalid_json"}
        
    # Process in background task to respond quickly to GitHub
    background_tasks.add_task(process_github_pr_merge, session, payload)
    return {"status": "queued"}
