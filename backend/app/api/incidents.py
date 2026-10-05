from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.models import User, Incident, AudioRecording
from backend.app.schemas.schemas import IncidentResponse
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incident History & Auditing"])

def _format_incident_with_audio(incident: Incident, db: Session) -> dict:
    recs = db.query(AudioRecording).filter(
        AudioRecording.session_id == incident.session_id
    ).order_by(AudioRecording.recorded_at.asc()).all()

    return {
        "id": incident.id,
        "session_id": incident.session_id,
        "user_id": incident.user_id,
        "mode": incident.mode,
        "risk_score": incident.risk_score,
        "risk_level": incident.risk_level,
        "started_at": incident.started_at,
        "ended_at": incident.ended_at,
        "location_summary": incident.location_summary,
        "timeline": incident.timeline,
        "agent_breakdown": incident.agent_breakdown,
        "emergency_action_taken": incident.emergency_action_taken,
        "contact_notification_status": incident.contact_notification_status,
        "call_status": incident.call_status,
        "reasoning": incident.reasoning,
        "audio_recordings": [
            {
                "id": r.id,
                "session_id": r.session_id,
                "filename": r.filename,
                "duration_seconds": r.duration_seconds,
                "file_size_bytes": r.file_size_bytes,
                "rms_level": r.rms_level,
                "is_distress": r.is_distress,
                "recorded_at": r.recorded_at,
                "mode": r.mode,
                "stream_url": f"/api/safety/audio/stream/{r.id}"
            }
            for r in recs
        ]
    }

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    mode: Optional[str] = Query(None, description="Filter by mode: LIVE or HYBRID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Incident).filter(Incident.user_id == current_user.id)
    if mode:
        query = query.filter(Incident.mode == mode.upper())
    incidents = query.order_by(Incident.started_at.desc()).all()
    return [_format_incident_with_audio(inc, db) for inc in incidents]

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.user_id == current_user.id
    ).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident record not found")
    return _format_incident_with_audio(incident, db)

