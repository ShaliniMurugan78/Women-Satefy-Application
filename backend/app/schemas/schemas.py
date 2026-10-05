import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# --- User & Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Emergency Contact Schemas ---
class ContactCreate(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = "Family"
    is_primary: Optional[bool] = False
    is_secondary: Optional[bool] = False

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None
    is_secondary: Optional[bool] = None
    is_verified: Optional[bool] = None

class ContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    relationship: str
    is_primary: bool
    is_secondary: bool
    is_verified: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Preferences & Baselines ---
class PreferenceResponse(BaseModel):
    critical_threshold: float
    workflow_timeout: int
    auto_call_enabled: bool
    audio_window_seconds: int
    default_scenario: str

    model_config = ConfigDict(from_attributes=True)

class PreferenceUpdate(BaseModel):
    critical_threshold: Optional[float] = None
    workflow_timeout: Optional[int] = None
    auto_call_enabled: Optional[bool] = None
    audio_window_seconds: Optional[int] = None
    default_scenario: Optional[str] = None

class BaselineResponse(BaseModel):
    resting_bpm: float
    walking_bpm: float
    running_bpm: float
    max_safe_bpm: float
    last_calibrated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class BaselineUpdate(BaseModel):
    resting_bpm: Optional[float] = None
    walking_bpm: Optional[float] = None
    running_bpm: Optional[float] = None
    max_safe_bpm: Optional[float] = None

# --- Telemetry Ingest Schemas ---
class GPSTelemetry(BaseModel):
    latitude: float
    longitude: float
    accuracy: float = 5.0
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    is_mock: bool = False

class SensorTelemetry(BaseModel):
    accel_x: float = 0.0
    accel_y: float = 0.0
    accel_z: float = 9.81
    gyro_x: float = 0.0
    gyro_y: float = 0.0
    gyro_z: float = 0.0
    motion_classification: Optional[str] = "STATIONARY"
    is_mock: bool = False

class AudioTelemetry(BaseModel):
    rms_volume: float = 0.0
    peak_frequency_hz: float = 0.0
    spectral_centroid: float = 0.0
    distress_keyword_detected: bool = False
    distress_phrase: Optional[str] = None
    is_mock: bool = False

class HeartRateTelemetry(BaseModel):
    heart_rate: float = 72.0
    activity_state: str = "RESTING"
    sensor_status: str = "CONNECTED"
    is_mock: bool = False

class PanicGestureTelemetry(BaseModel):
    trigger_type: str = "SHAKE_X3"          # "SHAKE_X3" | "VOLUME_LONG_PRESS"
    shake_count: int = 0                     # 0, 1, 2, or 3
    panic_triggered: bool = False
    peak_magnitude: Optional[float] = None   # m/s² of the strongest shake
    timestamp: Optional[str] = None
    session_id: Optional[str] = None
    is_mock: bool = False

# --- Safety Session Schemas ---
class SessionCreate(BaseModel):
    mode: str = "DEMO"  # "LIVE" or "DEMO"
    scenario: Optional[str] = "CRITICAL"  # "NORMAL", "CAUTION", "HIGH_RISK", "CRITICAL"
    initial_trigger_reason: Optional[str] = "SOS Manual Activation"
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_accuracy: Optional[float] = None

class AgentEventResponse(BaseModel):
    id: int
    session_id: str
    agent_name: str
    event_type: str
    risk_score: float
    risk_level: str
    confidence: float
    reasoning: Optional[str]
    features: Optional[Dict[str, Any]]
    latency_ms: float
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    id: str
    user_id: int
    mode: str
    scenario: str
    status: str
    current_agent: str
    risk_score: float
    risk_level: str
    confidence: float
    initial_trigger_reason: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    started_at: datetime.datetime
    ended_at: Optional[datetime.datetime]
    events: List[AgentEventResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Incident & Audio Schemas ---
class AudioRecordingResponse(BaseModel):
    id: int
    session_id: str
    filename: str
    duration_seconds: float = 0.0
    file_size_bytes: int = 0
    rms_level: float = 0.0
    is_distress: bool = False
    recorded_at: datetime.datetime
    mode: str = "LIVE"
    stream_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class IncidentResponse(BaseModel):
    id: str
    session_id: str
    user_id: int
    mode: str
    risk_score: float
    risk_level: str
    started_at: datetime.datetime
    ended_at: datetime.datetime
    location_summary: str
    timeline: Optional[List[Dict[str, Any]]]
    agent_breakdown: Optional[Dict[str, Any]]
    emergency_action_taken: str
    contact_notification_status: str
    call_status: str
    reasoning: Optional[str]
    audio_recordings: List[AudioRecordingResponse] = []

    model_config = ConfigDict(from_attributes=True)

Token.model_rebuild()

