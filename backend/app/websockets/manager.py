"""WebSocket connection manager for real-time board updates."""

from __future__ import annotations

import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections grouped by channel (e.g. project/board ID).

    Usage::

        manager = ConnectionManager()

        @app.websocket("/ws/{channel}")
        async def ws_endpoint(websocket: WebSocket, channel: str):
            await manager.connect(websocket, channel)
            try:
                while True:
                    data = await websocket.receive_text()
                    await manager.broadcast(channel, data)
            except WebSocketDisconnect:
                manager.disconnect(websocket, channel)
    """

    def __init__(self) -> None:
        # channel_id -> set of connected websockets
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._connection_users: dict[WebSocket, str] = {}

    async def connect(
        self, websocket: WebSocket, channel: str, user_id: str | None = None
    ) -> None:
        """Accept the websocket and register it to *channel*."""
        await websocket.accept()
        self._channels[channel].add(websocket)
        if user_id is not None:
            self._connection_users[websocket] = user_id

    def disconnect(self, websocket: WebSocket, channel: str) -> None:
        """Remove *websocket* from *channel*."""
        self._channels[channel].discard(websocket)
        self._connection_users.pop(websocket, None)
        if not self._channels[channel]:
            del self._channels[channel]

    async def revoke_user(self, channel: str, user_id: str) -> None:
        """Close a member's open connections after their project access is revoked."""
        connections = [
            websocket
            for websocket in self._channels.get(channel, set())
            if self._connection_users.get(websocket) == user_id
        ]
        for websocket in connections:
            self.disconnect(websocket, channel)
            try:
                await websocket.close(code=1008, reason="Project access revoked")
            except Exception:
                logger.debug("Unable to close revoked WebSocket connection", exc_info=True)

    async def broadcast(self, channel: str, message: str | dict) -> None:
        """Send *message* to every connection in *channel*.

        If *message* is a ``dict`` it will be JSON-serialised automatically.
        Dead connections are silently removed.
        """
        if isinstance(message, dict):
            message = json.dumps(message)

        dead: list[WebSocket] = []
        for ws in self._channels.get(channel, set()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self._channels[channel].discard(ws)

    async def send_personal(self, websocket: WebSocket, message: str | dict) -> None:
        """Send a message to a single websocket."""
        if isinstance(message, dict):
            message = json.dumps(message)
        await websocket.send_text(message)

    @property
    def active_channels(self) -> list[str]:
        """Return list of channels that have at least one connection."""
        return list(self._channels.keys())

    def channel_count(self, channel: str) -> int:
        """Return the number of connections in *channel*."""
        return len(self._channels.get(channel, set()))


# Singleton instance used across the application
manager = ConnectionManager()
