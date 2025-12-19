"""
WebSocket connection manager for real-time notifications.

Manages WebSocket connections per user and broadcasts notifications
when events occur (e.g., document processing complete).
"""
from typing import Dict, Set
from uuid import UUID
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications."""

    def __init__(self):
        # Map user_id to set of WebSocket connections
        # A user can have multiple connections (multiple tabs/devices)
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """
        Accept and store a new WebSocket connection for a user.

        Args:
            user_id: User UUID as string
            websocket: WebSocket connection
        """
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        """
        Remove a WebSocket connection for a user.

        Args:
            user_id: User UUID as string
            websocket: WebSocket connection to remove
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Remove user entry if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

            logger.info(f"WebSocket disconnected for user {user_id}. Remaining connections: {len(self.active_connections.get(user_id, []))}")

    async def send_personal_message(self, user_id: str, message: dict):
        """
        Send a message to all connections for a specific user.

        Args:
            user_id: User UUID as string
            message: Dictionary to send as JSON
        """
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return

        # Send to all user's connections (multiple tabs/devices)
        disconnected = set()
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                disconnected.add(websocket)

        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(user_id, websocket)

    async def notify_document_completed(self, user_id: UUID, document_id: UUID, filename: str):
        """
        Notify user that their document processing is complete.

        Args:
            user_id: User UUID
            document_id: Document UUID
            filename: Original filename
        """
        message = {
            "type": "document_completed",
            "document_id": str(document_id),
            "filename": filename,
            "message": "Your bank statement is ready for review!"
        }
        await self.send_personal_message(str(user_id), message)
        logger.info(f"Sent document completion notification to user {user_id} for document {document_id}")

    async def broadcast_banner_update(self, banners: list):
        """
        Broadcast banner update to all connected users.

        This is called when an admin creates, updates, or deletes a system banner.
        All connected users will receive the updated list of active banners.

        Args:
            banners: List of active banner dictionaries
        """
        message = {
            "type": "banner_update",
            "banners": banners
        }

        # Send to all connected users
        total_sent = 0
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(user_id, message)
            total_sent += len(self.active_connections.get(user_id, set()))

        logger.info(f"Broadcast banner update to {len(self.active_connections)} users ({total_sent} connections)")


# Global connection manager instance
manager = ConnectionManager()
