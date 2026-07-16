import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import decode_token
from app.models.project import ProjectMember
from app.models.user import User
from app.websockets.manager import manager as ws_manager

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_ws_user(token: str, session: AsyncSession) -> User | None:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            return user
    except Exception:
        pass
    return None


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: Annotated[str, Query()],
    session: AsyncSession = Depends(get_async_session),
):
    # 1. Authenticate user
    user = await get_ws_user(token, session)
    if not user:
        await websocket.close(code=1008)  # Policy Violation
        return
        
    # 2. Check if user is a member of the project
    member_res = await session.execute(
        select(ProjectMember).where(
            (ProjectMember.project_id == project_id) & (ProjectMember.user_id == user.id)
        )
    )
    if not member_res.scalar_one_or_none():
        await websocket.close(code=1008)
        return
        
    # 3. Connect to the WebSocket room/channel
    channel = str(project_id)
    await ws_manager.connect(websocket, channel)
    
    try:
        while True:
            # Wait for messages from this client
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                event = payload.get("event")
                
                # Check for client-initiated events like "user_editing" or "user_stopped_editing"
                if event in ("user_editing", "user_stopped_editing"):
                    # Broadcast the action to all members in the project room
                    await ws_manager.broadcast(
                        channel,
                        {
                            "event": event,
                            "user_id": str(user.id),
                            "username": user.username,
                            "full_name": user.full_name,
                            "issue_id": payload.get("issue_id"),
                        },
                    )
            except json.JSONDecodeError:
                # Ignore malformed JSON messages
                pass
                
    except WebSocketDisconnect:
        # Disconnect client
        ws_manager.disconnect(websocket, channel)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, channel)
