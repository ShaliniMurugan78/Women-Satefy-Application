from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.config.settings import settings
from backend.app.database.session import get_db
from backend.app.models.models import User, UserPreference
from backend.app.schemas.schemas import PreferenceResponse, PreferenceUpdate
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Application Settings & Configuration"])

class SystemConfigResponse(BaseModel):
    app_name: str
    version: str
    critical_threshold: float
    high_threshold: float
    suspicious_threshold: float
    caution_threshold: float
    workflow_timeout: int
    fusion_weights: Dict[str, float]
    emergency_service_number: str
    user_preferences: PreferenceResponse

class SystemConfigUpdate(BaseModel):
    critical_threshold: Optional[float] = None
    workflow_timeout: Optional[int] = None
    fusion_weights: Optional[Dict[str, float]] = None
    emergency_service_number: Optional[str] = None
    user_preferences: Optional[PreferenceUpdate] = None

@router.get("", response_model=SystemConfigResponse)
def get_system_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return SystemConfigResponse(
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        critical_threshold=settings.CRITICAL_RISK_THRESHOLD,
        high_threshold=settings.HIGH_RISK_THRESHOLD,
        suspicious_threshold=settings.SUSPICIOUS_RISK_THRESHOLD,
        caution_threshold=settings.CAUTION_RISK_THRESHOLD,
        workflow_timeout=settings.SAFETY_WORKFLOW_TIMEOUT,
        fusion_weights=settings.FUSION_WEIGHTS,
        emergency_service_number=settings.EMERGENCY_SERVICE_NUMBER,
        user_preferences=PreferenceResponse.model_validate(pref)
    )

@router.put("", response_model=SystemConfigResponse)
def update_system_settings(
    config_in: SystemConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if config_in.critical_threshold is not None:
        settings.CRITICAL_RISK_THRESHOLD = config_in.critical_threshold
    if config_in.workflow_timeout is not None:
        settings.SAFETY_WORKFLOW_TIMEOUT = config_in.workflow_timeout
    if config_in.fusion_weights is not None:
        settings.FUSION_WEIGHTS = config_in.fusion_weights
    if config_in.emergency_service_number is not None:
        settings.EMERGENCY_SERVICE_NUMBER = config_in.emergency_service_number

    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if config_in.user_preferences:
        for field, value in config_in.user_preferences.dict(exclude_unset=True).items():
            if value is not None:
                setattr(pref, field, value)

    db.commit()
    db.refresh(pref)

    return get_system_settings(current_user=current_user, db=db)
