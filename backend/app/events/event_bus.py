import asyncio
import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("safety_event_bus")

class EventBus:
    def __init__(self):
        # Maps session_id -> Set of active WebSockets
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        # In-memory structured event logs for session timeline
        self._session_logs: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self._active_connections:
            self._active_connections[session_id] = set()
            self._session_logs[session_id] = []
        self._active_connections[session_id].add(websocket)
        logger.info(f"WebSocket connected for session: {session_id}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self._active_connections:
            self._active_connections[session_id].discard(websocket)
            if not self._active_connections[session_id]:
                del self._active_connections[session_id]
        logger.info(f"WebSocket disconnected for session: {session_id}")

    async def broadcast_event(self, session_id: str, event_type: str, data: Dict[str, Any]):
        message = {
            "event_type": event_type,
            "session_id": session_id,
            "data": data
        }
        
        # Store in session event log
        if session_id not in self._session_logs:
            self._session_logs[session_id] = []
        self._session_logs[session_id].append(message)

        # Broadcast to all connected clients for this session
        if session_id in self._active_connections:
            dead_sockets = set()
            for ws in self._active_connections[session_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception as ex:
                    logger.warning(f"Error sending to websocket: {ex}")
                    dead_sockets.add(ws)
            
            for dead_ws in dead_sockets:
                self.disconnect(session_id, dead_ws)

    def get_session_timeline(self, session_id: str) -> List[Dict[str, Any]]:
        return self._session_logs.get(session_id, [])

event_bus = EventBus()
