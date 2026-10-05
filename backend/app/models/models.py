import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, LargeBinary
from sqlalchemy.orm import relationship as orm_relationship
from backend.app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    contacts = orm_relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    preferences = orm_relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    baseline = orm_relationship("HeartRateBaseline", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = orm_relationship("SafetySession", back_populates="user")
    incidents = orm_relationship("Incident", back_populates="user")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    relationship = Column(String(100), default="Family")
    is_primary = Column(Boolean, default=False)
    is_secondary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = orm_relationship("User", back_populates="contacts")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    critical_threshold = Column(Float, default=80.0)
    workflow_timeout = Column(Integer, default=180)
    auto_call_enabled = Column(Boolean, default=False)
    audio_window_seconds = Column(Integer, default=15)
    default_scenario = Column(String(50), default="CRITICAL")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = orm_relationship("User", back_populates="preferences")
 
 
class HeartRateBaseline(Base):
    __tablename__ = "heart_rate_baselines"
 
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    resting_bpm = Column(Float, default=72.0)
    walking_bpm = Column(Float, default=95.0)
    running_bpm = Column(Float, default=140.0)
    max_safe_bpm = Column(Float, default=165.0)
    last_calibrated_at = Column(DateTime, default=datetime.datetime.utcnow)
 
    user = orm_relationship("User", back_populates="baseline")
 
 
class SafetySession(Base):
    __tablename__ = "safety_sessions"
 
    id = Column(String(100), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mode = Column(String(20), default="DEMO")  # "LIVE" or "DEMO"
    scenario = Column(String(50), default="CRITICAL") # "NORMAL", "CAUTION", "HIGH_RISK", "CRITICAL"
    status = Column(String(50), default="ACTIVE") # "ACTIVE", "COMPLETED", "CANCELLED", "ESCALATED"
    current_agent = Column(String(50), default="INITIAL_TRIGGER")
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="SAFE")
    confidence = Column(Float, default=0.0)
    initial_trigger_reason = Column(String(255), default="User activated SOS emergency monitoring")
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_accuracy = Column(Float, nullable=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
 
    user = orm_relationship("User", back_populates="sessions")
    events = orm_relationship("AgentEvent", back_populates="session", cascade="all, delete-orphan")
 
 
class AgentEvent(Base):
    __tablename__ = "agent_events"
 
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("safety_sessions.id"), nullable=False)
    agent_name = Column(String(100), nullable=False) # "GPS_AGENT", "BEHAVIOUR_AGENT", etc.
    event_type = Column(String(50), nullable=False) # "STARTED", "COMPLETED", "FAILED", "TIMEOUT", "SKIPPED"
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="SAFE")
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text, nullable=True)
    features = Column(JSON, nullable=True)
    latency_ms = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
 
    session = orm_relationship("SafetySession", back_populates="events")
 
 
class Incident(Base):
    __tablename__ = "incidents"
 
    id = Column(String(100), primary_key=True, index=True)
    session_id = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mode = Column(String(20), default="LIVE") # "LIVE" or "HYBRID"
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="CRITICAL")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, default=datetime.datetime.utcnow)
    location_summary = Column(String(255), default="Unknown Location")
    timeline = Column(JSON, nullable=True) # list of structured events
    agent_breakdown = Column(JSON, nullable=True) # scores, confidences & reasonings
    emergency_action_taken = Column(String(255), default="Emergency contacts notified, location shared")
    contact_notification_status = Column(String(100), default="DISPATCHED")
    call_status = Column(String(100), default="STANDBY")
    reasoning = Column(Text, nullable=True)
 
    user = orm_relationship("User", back_populates="incidents")


class AudioRecording(Base):
    """Stores live microphone recording chunks per safety session."""
    __tablename__ = "audio_recordings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)         # saved .webm file name
    file_path = Column(String(500), nullable=False)        # server-side absolute path
    duration_seconds = Column(Float, default=0.0)
    file_size_bytes = Column(Integer, default=0)
    rms_level = Column(Float, default=0.0)                 # loudness indicator
    is_distress = Column(Boolean, default=False)           # flagged by voice agent
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    mode = Column(String(20), default="LIVE")



class LocationRecord(Base):
    __tablename__ = "location_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, default=5.0)
    speed = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    is_mock = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class WatchConnection(Base):
    __tablename__ = "watch_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_name = Column(String(100), default="Guardian SmartWatch BLE")
    device_address = Column(String(100), default="BLE:AA:BB:CC:DD:EE:FF")
    is_connected = Column(Boolean, default=True)
    battery_level = Column(Integer, default=92)
    last_heart_rate = Column(Float, default=74.0)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
