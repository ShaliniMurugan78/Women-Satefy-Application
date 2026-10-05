import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config.settings import settings
from backend.app.database.session import engine, Base
from backend.app.models import models
from backend.app.api.auth import router as auth_router
from backend.app.api.contacts import router as contacts_router
from backend.app.api.safety import router as safety_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.settings_api import router as settings_router
from backend.app.api.devices import router as devices_router
from backend.app.api.twilio_webhooks import router as twilio_router
from backend.app.events.event_bus import event_bus

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safety_guardian_main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database initialized. {settings.APP_NAME} v{settings.VERSION} ready.")
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Women Safety Guardian Platform with Sequential Multi-Agent Risk Fusion Pipeline",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST Routers
app.include_router(auth_router, prefix="/api")
app.include_router(contacts_router, prefix="/api")
app.include_router(safety_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(devices_router, prefix="/api")
app.include_router(twilio_router)  # Twilio webhooks: /api/twilio/sms-reply, /api/twilio/call-status

@app.get("/")
def health_check():
    return {
        "status": "active",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "critical_threshold": settings.CRITICAL_RISK_THRESHOLD,
        "workflow_timeout_seconds": settings.SAFETY_WORKFLOW_TIMEOUT
    }

# Real-Time WebSocket for Safety Monitoring Sessions
@app.websocket("/ws/safety/{session_id}")
async def websocket_safety_endpoint(websocket: WebSocket, session_id: str):
    await event_bus.connect(session_id, websocket)
    try:
        while True:
            # Keep socket alive and receive client heartbeats or telemetry
            data = await websocket.receive_text()
            logger.debug(f"Received WS message for {session_id}: {data}")
    except WebSocketDisconnect:
        event_bus.disconnect(session_id, websocket)
        logger.info(f"Client disconnected from safety websocket: {session_id}")
    except Exception as ex:
        logger.warning(f"WebSocket error for {session_id}: {ex}")
        event_bus.disconnect(session_id, websocket)
