"""
WebSocket endpoint for real-time notifications.

Provides WebSocket connection for users to receive real-time updates
about document processing, transaction imports, and other events.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.exceptions import HTTPException

from app.core.websocket_manager import manager
from app.api.deps import get_current_user_ws
from app.models.user import User

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    current_user: User = Depends(get_current_user_ws)
):
    """
    WebSocket endpoint for real-time notifications.

    Clients connect to this endpoint to receive real-time updates about:
    - Document processing completion
    - Transaction import status
    - System notifications

    The connection is authenticated using the access token passed as a query parameter.

    Example:
        ws://localhost:8000/api/v1/ws?token=<access_token>

    Args:
        websocket: WebSocket connection
        current_user: Authenticated user (from token)
    """
    user_id = str(current_user.id)

    # Connect user
    await manager.connect(user_id, websocket)

    try:
        # Keep connection alive and listen for client messages
        while True:
            # Receive messages from client (mostly just keepalives)
            data = await websocket.receive_text()

            # Echo ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        # Clean disconnect
        manager.disconnect(user_id, websocket)
    except Exception as e:
        # Error occurred
        manager.disconnect(user_id, websocket)
        raise
