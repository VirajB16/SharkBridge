import logging
import socketio
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Initialize Socket.IO server with ASGI mode and wildcard CORS for real-time deal room chat
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

@sio.event
async def connect(sid, environ, auth=None):
    logger.info(f"Socket.IO client connected: sid={sid}")
    await sio.emit("connection_ack", {"status": "connected", "sid": sid}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: sid={sid}")

@sio.on("join_deal_room")
async def handle_join_deal_room(sid, data):
    """
    Client joins a dedicated deal chat room: 'deal_{application_id}'
    data can be { 'application_id': '...' } or a string application_id
    """
    app_id = data.get("application_id") if isinstance(data, dict) else str(data)
    if not app_id:
        return {"error": "application_id is required"}

    room_name = f"deal_{app_id}"
    try:
        await sio.enter_room(sid, room_name)
        logger.info(f"Socket {sid} entered room: {room_name}")
        await sio.emit(
            "room_joined",
            {"room": room_name, "application_id": app_id, "status": "active"},
            to=sid
        )
    except Exception as e:
        logger.debug(f"Room enter note (sid may be disconnected): {e}")

    return {"status": "ok", "room": room_name}

@sio.on("leave_deal_room")
async def handle_leave_deal_room(sid, data):
    app_id = data.get("application_id") if isinstance(data, dict) else str(data)
    if app_id:
        room_name = f"deal_{app_id}"
        try:
            await sio.leave_room(sid, room_name)
            logger.info(f"Socket {sid} left room: {room_name}")
        except Exception as e:
            logger.debug(f"Room leave note: {e}")
    return {"status": "ok"}

@sio.on("send_message")
async def handle_socket_send_message(sid, data):
    """
    Handles real-time deal message received directly via Socket.IO
    """
    if isinstance(data, dict):
        app_id = data.get("application_id")
        if app_id:
            room_name = f"deal_{app_id}"
            await sio.emit("deal_message", data, room=room_name)

async def broadcast_deal_message(application_id: str, message: Dict[str, Any]):
    """
    Broadcasts a new deal message to all participants connected in that deal room.
    """
    room_name = f"deal_{application_id}"
    try:
        await sio.emit("deal_message", message, room=room_name)
        logger.info(f"Broadcasted deal message to room {room_name}")
    except Exception as e:
        logger.warning(f"Failed to broadcast deal message via Socket.IO: {e}")
