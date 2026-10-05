import asyncio
import datetime
import uuid
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.models import User, SafetySession, AgentEvent, HeartRateBaseline, AudioRecording
from backend.app.schemas.schemas import (
    SessionCreate, SessionResponse,
    GPSTelemetry, SensorTelemetry, AudioTelemetry, HeartRateTelemetry, PanicGestureTelemetry,
    BaselineResponse, BaselineUpdate
)
from backend.app.security.auth import get_current_user
from backend.app.orchestrator.safety_orchestrator import safety_orchestrator
from backend.app.services import (
    real_gps_service, real_sensor_service, real_audio_service, real_watch_service
)
from backend.app.agents.panic_gesture_agent import update_live_panic

AUDIO_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "recordings")
os.makedirs(AUDIO_STORAGE_DIR, exist_ok=True)

router = APIRouter(prefix="/safety", tags=["Safety Monitoring & Sessions"])

@router.post("/sessions", response_model=SessionResponse)
async def create_safety_session(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
    mode = session_in.mode.upper() if session_in.mode else "DEMO"
    scenario = session_in.scenario.upper() if session_in.scenario else "CRITICAL"

    new_session = SafetySession(
        id=session_id,
        user_id=current_user.id,
        mode=mode,
        scenario=scenario,
        status="ACTIVE",
        current_agent="SUSPICIOUS_PLACE",
        risk_score=0.0,
        risk_level="SAFE",
        confidence=0.0,
        initial_trigger_reason=session_in.initial_trigger_reason or "User Activated SOS Guardian Session",
        location_lat=session_in.location_lat,
        location_lng=session_in.location_lng,
        location_accuracy=session_in.location_accuracy,
        started_at=datetime.datetime.utcnow()
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Immediately feed live coordinates to real GPS service if present
    if session_in.location_lat and session_in.location_lng:
        real_gps_service.update_live_telemetry(
            user_id=current_user.id,
            lat=session_in.location_lat,
            lng=session_in.location_lng,
            accuracy=session_in.location_accuracy or 10.0
        )

    # Spawn asynchronous sequential orchestrator task
    task = asyncio.create_task(
        safety_orchestrator.run_safety_pipeline(
            session_id=session_id,
            user_id=current_user.id,
            mode=mode,
            scenario=scenario
        )
    )
    safety_orchestrator._running_tasks[session_id] = task

    return new_session

@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_safety_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_record = db.query(SafetySession).filter(
        SafetySession.id == session_id,
        SafetySession.user_id == current_user.id
    ).first()
    if not session_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety session not found")
    return session_record

@router.post("/sessions/{session_id}/cancel")
def cancel_safety_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_record = db.query(SafetySession).filter(
        SafetySession.id == session_id,
        SafetySession.user_id == current_user.id
    ).first()
    if not session_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety session not found")

    safety_orchestrator.cancel_session(session_id)
    session_record.status = "CANCELLED"
    session_record.ended_at = datetime.datetime.utcnow()
    db.commit()

    return {"status": "success", "message": f"Session {session_id} cancelled safely."}

# --- Telemetry Ingest for Live Mode ---
@router.post("/telemetry/gps")
def ingest_live_gps(
    telemetry: GPSTelemetry,
    current_user: User = Depends(get_current_user)
):
    real_gps_service.update_live_telemetry(
        user_id=current_user.id,
        lat=telemetry.latitude,
        lng=telemetry.longitude,
        accuracy=telemetry.accuracy,
        speed=telemetry.speed or 0.0
    )
    return {"status": "received", "sensor": "GPS", "user_id": current_user.id}

@router.post("/telemetry/sensor")
def ingest_live_sensor(
    telemetry: SensorTelemetry,
    current_user: User = Depends(get_current_user)
):
    real_sensor_service.update_live_motion(
        user_id=current_user.id,
        accel_x=telemetry.accel_x,
        accel_y=telemetry.accel_y,
        accel_z=telemetry.accel_z,
        gyro_x=telemetry.gyro_x,
        gyro_y=telemetry.gyro_y,
        gyro_z=telemetry.gyro_z
    )
    return {"status": "received", "sensor": "MOTION", "user_id": current_user.id}

@router.post("/telemetry/audio")
def ingest_live_audio(
    telemetry: AudioTelemetry,
    current_user: User = Depends(get_current_user)
):
    real_audio_service.update_live_audio(
        user_id=current_user.id,
        rms_volume=telemetry.rms_volume,
        peak_frequency_hz=telemetry.peak_frequency_hz,
        spectral_centroid=telemetry.spectral_centroid,
        distress_keyword=telemetry.distress_keyword_detected,
        phrase=telemetry.distress_phrase
    )
    return {"status": "received", "sensor": "AUDIO", "user_id": current_user.id}

@router.post("/telemetry/watch")
def ingest_live_watch(
    telemetry: HeartRateTelemetry,
    current_user: User = Depends(get_current_user)
):
    real_watch_service.update_live_hr(
        user_id=current_user.id,
        hr_bpm=telemetry.heart_rate,
        activity_state=telemetry.activity_state,
        sensor_contact=telemetry.sensor_status == "CONNECTED"
    )
    return {"status": "received", "sensor": "HEART_RATE", "user_id": current_user.id}


@router.post("/telemetry/panic")
def ingest_panic_gesture(
    telemetry: PanicGestureTelemetry,
    current_user: User = Depends(get_current_user)
):
    """
    Receives real-time panic gesture events from the phone/browser.
    Called by the frontend panicGestureService whenever:
      - shake_count increments (partial progress update)
      - panic_triggered = True (3 shakes or volume-long-press confirmed)
    """
    update_live_panic(current_user.id, {
        "trigger_type":    telemetry.trigger_type,
        "shake_count":     telemetry.shake_count,
        "panic_triggered": telemetry.panic_triggered,
        "peak_magnitude":  telemetry.peak_magnitude,
        "trigger_label":   (
            "SHAKE × 3 DETECTED"
            if telemetry.trigger_type == "SHAKE_X3"
            else "VOLUME LONG PRESS DETECTED"
        ),
        "timestamp":       telemetry.timestamp,
        "session_id":      telemetry.session_id,
    })
    return {
        "status":          "received",
        "sensor":          "PANIC_GESTURE",
        "trigger_type":    telemetry.trigger_type,
        "shake_count":     telemetry.shake_count,
        "panic_triggered": telemetry.panic_triggered,
        "user_id":         current_user.id,
    }

# --- Baseline Management ---
@router.get("/baseline", response_model=BaselineResponse)
def get_heart_rate_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    baseline = db.query(HeartRateBaseline).filter(HeartRateBaseline.user_id == current_user.id).first()
    if not baseline:
        baseline = HeartRateBaseline(user_id=current_user.id)
        db.add(baseline)
        db.commit()
        db.refresh(baseline)
    return baseline

@router.put("/baseline", response_model=BaselineResponse)
def update_heart_rate_baseline(
    baseline_in: BaselineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    baseline = db.query(HeartRateBaseline).filter(HeartRateBaseline.user_id == current_user.id).first()
    if not baseline:
        baseline = HeartRateBaseline(user_id=current_user.id)
        db.add(baseline)

    for field, value in baseline_in.dict(exclude_unset=True).items():
        if value is not None:
            setattr(baseline, field, value)

    baseline.last_calibrated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(baseline)
    return baseline


# ─── Audio Recording Upload & Retrieval ─────────────────────────────────────

@router.post("/audio/upload")
async def upload_audio_chunk(
    session_id: str = Form(...),
    rms_level: float = Form(0.0),
    duration_seconds: float = Form(0.0),
    is_distress: bool = Form(False),
    mode: str = Form("LIVE"),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Receive a WebM audio chunk from the browser MediaRecorder and persist it."""
    file_data = await audio_file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Empty audio file received")

    # Build a unique filename: rec_<sessionId>_<timestamp>.webm
    timestamp_tag = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_session = session_id.replace("/", "_").replace("\\", "_")
    filename = f"rec_{safe_session}_{timestamp_tag}.webm"
    file_path = os.path.abspath(os.path.join(AUDIO_STORAGE_DIR, filename))

    # Write to disk
    with open(file_path, "wb") as f:
        f.write(file_data)

    # Persist metadata to DB
    recording = AudioRecording(
        session_id=session_id,
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        duration_seconds=duration_seconds,
        file_size_bytes=len(file_data),
        rms_level=rms_level,
        is_distress=is_distress,
        mode=mode.upper(),
        recorded_at=datetime.datetime.utcnow()
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    return {
        "status": "saved",
        "recording_id": recording.id,
        "filename": filename,
        "file_size_bytes": len(file_data),
        "duration_seconds": duration_seconds,
        "is_distress": is_distress
    }


@router.get("/audio/{session_id}")
def list_session_recordings(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all audio recordings for a session."""
    recordings = db.query(AudioRecording).filter(
        AudioRecording.session_id == session_id,
        AudioRecording.user_id == current_user.id
    ).order_by(AudioRecording.recorded_at.asc()).all()

    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "filename": r.filename,
            "duration_seconds": r.duration_seconds,
            "file_size_bytes": r.file_size_bytes,
            "rms_level": r.rms_level,
            "is_distress": r.is_distress,
            "recorded_at": r.recorded_at.isoformat(),
            "mode": r.mode,
            "stream_url": f"/api/safety/audio/stream/{r.id}"
        }
        for r in recordings
    ]


@router.get("/audio/stream/{recording_id}")
def stream_audio_recording(
    recording_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Stream a single audio recording file back to the browser for playback."""
    recording = db.query(AudioRecording).filter(
        AudioRecording.id == recording_id
    ).first()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    if not os.path.exists(recording.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    media_type = "audio/wav" if recording.file_path.endswith(".wav") else ("audio/ogg" if recording.file_path.endswith(".ogg") else "audio/webm")
    return FileResponse(
        recording.file_path,
        media_type=media_type,
        filename=recording.filename,
        headers={"Accept-Ranges": "bytes"}
    )


@router.get("/audio/demo/{scenario}")
def stream_demo_audio(scenario: str):
    """Stream authentic demo scenario audio file (.wav) for playback in UI."""
    filename_map = {
        "NORMAL": "normal_environment.wav",
        "CAUTION": "suspicious_noise.wav",
        "HIGH_RISK": "suspicious_noise.wav",
        "CRITICAL": "distress_sound.wav"
    }
    filename = filename_map.get(scenario.upper(), "distress_sound.wav")
    file_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo", "audio", filename)
    if not os.path.exists(file_path):
        file_path = os.path.join(os.getcwd(), "backend", "demo", "audio", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Demo audio file not found")
    return FileResponse(file_path, media_type="audio/wav", filename=filename, headers={"Accept-Ranges": "bytes"})


