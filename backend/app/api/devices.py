from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime

from backend.app.database.session import get_db
from backend.app.models.models import User, WatchConnection
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["Connected Devices & Wearables"])

class WatchStatusResponse(BaseModel):
    device_name: str
    device_address: str
    is_connected: bool
    battery_level: int
    last_heart_rate: float
    last_seen: datetime.datetime

class WatchConnectRequest(BaseModel):
    device_name: str
    device_address: str

@router.get("/watch", response_model=WatchStatusResponse)
def get_watch_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    watch = db.query(WatchConnection).filter(WatchConnection.user_id == current_user.id).first()
    if not watch:
        watch = WatchConnection(
            user_id=current_user.id,
            device_name="Guardian SmartWatch BLE",
            device_address="BLE:7E:9A:F1:44:B2:01",
            is_connected=True,
            battery_level=88,
            last_heart_rate=72.0
        )
        db.add(watch)
        db.commit()
        db.refresh(watch)

    return WatchStatusResponse(
        device_name=watch.device_name,
        device_address=watch.device_address,
        is_connected=watch.is_connected,
        battery_level=watch.battery_level,
        last_heart_rate=watch.last_heart_rate,
        last_seen=watch.last_seen
    )

@router.post("/watch/connect", response_model=WatchStatusResponse)
def connect_watch(req: WatchConnectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    watch = db.query(WatchConnection).filter(WatchConnection.user_id == current_user.id).first()
    if not watch:
        watch = WatchConnection(user_id=current_user.id)
        db.add(watch)

    watch.device_name = req.device_name
    watch.device_address = req.device_address
    watch.is_connected = True
    watch.last_seen = datetime.datetime.utcnow()
    db.commit()
    db.refresh(watch)
    return get_watch_status(current_user=current_user, db=db)

@router.post("/watch/disconnect")
def disconnect_watch(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    watch = db.query(WatchConnection).filter(WatchConnection.user_id == current_user.id).first()
    if watch:
        watch.is_connected = False
        watch.last_seen = datetime.datetime.utcnow()
        db.commit()
    return {"status": "success", "message": "Wearable disconnected."}
