from unittest.mock import AsyncMock

import pytest

from app.websockets.manager import ConnectionManager


@pytest.mark.asyncio
async def test_revoking_member_closes_only_their_project_connections() -> None:
    manager = ConnectionManager()
    removed_member_socket = AsyncMock()
    other_member_socket = AsyncMock()
    await manager.connect(removed_member_socket, "project-1", "user-1")
    await manager.connect(other_member_socket, "project-1", "user-2")

    await manager.revoke_user("project-1", "user-1")

    assert manager.channel_count("project-1") == 1
    removed_member_socket.close.assert_awaited_once_with(
        code=1008, reason="Project access revoked"
    )
    other_member_socket.close.assert_not_awaited()
