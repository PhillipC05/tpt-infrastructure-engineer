from fastapi import WebSocket
from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio

from models import User
from audit_logger import AuditLogger


class UserPresence(BaseModel):
    user_id: str
    name: str
    page: str
    cursor_x: Optional[float] = None
    cursor_y: Optional[float] = None
    last_seen: datetime
    is_typing: bool = False


class DocumentLock(BaseModel):
    document_id: str
    document_type: str
    user_id: str
    user_name: str
    locked_at: datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[WebSocket, UserPresence]] = {}
        self.document_locks: Dict[str, DocumentLock] = {}
        self.notification_queues: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, project_id: str, user: User):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = {}
        
        presence = UserPresence(
            user_id=str(user.id),
            name=f"{user.first_name} {user.last_name}",
            page="project",
            last_seen=datetime.utcnow()
        )
        
        self.active_connections[project_id][websocket] = presence
        
        # Broadcast user joined event
        await self.broadcast(project_id, {
            "type": "user_joined",
            "user_id": str(user.id),
            "name": presence.name,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Send current presence list to new user
        await websocket.send_json({
            "type": "presence_list",
            "users": [p.dict() for p in self.active_connections[project_id].values()]
        })
        
        # Send active document locks
        await websocket.send_json({
            "type": "active_locks",
            "locks": [l.dict() for l in self.document_locks.values() if l.document_id.startswith(project_id)]
        })

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections and websocket in self.active_connections[project_id]:
            user = self.active_connections[project_id][websocket]
            del self.active_connections[project_id][websocket]
            
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
                
            # Release any locks held by this user
            locks_to_release = [doc_id for doc_id, lock in self.document_locks.items() if lock.user_id == user.user_id]
            for doc_id in locks_to_release:
                del self.document_locks[doc_id]
            
            # Broadcast user left event
            asyncio.create_task(self.broadcast(project_id, {
                "type": "user_left",
                "user_id": user.user_id,
                "name": user.name,
                "timestamp": datetime.utcnow().isoformat()
            }))

    async def broadcast(self, project_id: str, message: dict, sender: WebSocket = None):
        if project_id in self.active_connections:
            for connection in list(self.active_connections[project_id].keys()):
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        # Clean up dead connections
                        self.disconnect(connection, project_id)

    async def handle_message(self, websocket: WebSocket, project_id: str, data: dict, user: User, db: Session):
        message_type = data.get("type")
        
        if message_type == "cursor_update":
            if project_id in self.active_connections and websocket in self.active_connections[project_id]:
                presence = self.active_connections[project_id][websocket]
                presence.cursor_x = data.get("x")
                presence.cursor_y = data.get("y")
                presence.page = data.get("page")
                presence.last_seen = datetime.utcnow()
                
                await self.broadcast(project_id, {
                    "type": "cursor_position",
                    "user_id": str(user.id),
                    "x": presence.cursor_x,
                    "y": presence.cursor_y,
                    "page": presence.page
                }, sender=websocket)

        elif message_type == "lock_document":
            document_id = data.get("document_id")
            document_type = data.get("document_type")
            
            if document_id not in self.document_locks:
                lock = DocumentLock(
                    document_id=document_id,
                    document_type=document_type,
                    user_id=str(user.id),
                    user_name=f"{user.first_name} {user.last_name}",
                    locked_at=datetime.utcnow()
                )
                self.document_locks[document_id] = lock
                
                await self.broadcast(project_id, {
                    "type": "document_locked",
                    "lock": lock.dict()
                })
                
                await websocket.send_json({"type": "lock_granted", "document_id": document_id})
            else:
                await websocket.send_json({
                    "type": "lock_denied",
                    "document_id": document_id,
                    "held_by": self.document_locks[document_id].user_name
                })

        elif message_type == "unlock_document":
            document_id = data.get("document_id")
            if document_id in self.document_locks and self.document_locks[document_id].user_id == str(user.id):
                del self.document_locks[document_id]
                await self.broadcast(project_id, {
                    "type": "document_unlocked",
                    "document_id": document_id
                })

        elif message_type == "activity_event":
            activity = {
                "type": "activity",
                "user_id": str(user.id),
                "user_name": f"{user.first_name} {user.last_name}",
                "action": data.get("action"),
                "entity_type": data.get("entity_type"),
                "entity_id": data.get("entity_id"),
                "timestamp": datetime.utcnow().isoformat()
            }
            await self.broadcast(project_id, activity)
            
            audit = AuditLogger(db, user)
            audit.log_action(data.get("action"), data.get("entity_type"), data.get("entity_id"))

        elif message_type == "typing_start":
            await self.broadcast(project_id, {
                "type": "typing_status",
                "user_id": str(user.id),
                "is_typing": True
            }, sender=websocket)

        elif message_type == "typing_stop":
            await self.broadcast(project_id, {
                "type": "typing_status",
                "user_id": str(user.id),
                "is_typing": False
            }, sender=websocket)

    async def send_notification(self, user_id: str, notification: dict):
        for project_id, connections in self.active_connections.items():
            for websocket, presence in connections.items():
                if presence.user_id == user_id:
                    try:
                        await websocket.send_json({
                            "type": "notification",
                            "notification": notification
                        })
                    except Exception:
                        self.disconnect(websocket, project_id)