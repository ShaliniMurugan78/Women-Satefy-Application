import os
from typing import Dict
from pydantic import BaseModel, Field

class AppSettings(BaseModel):
    # App General
    APP_NAME: str = "Women Safety AI Guardian"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "safety-guardian-ai-super-secret-key-2026-xyz987")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safety_guardian.db")
    
    # Safety Thresholds & Timeouts
    CRITICAL_RISK_THRESHOLD: float = 80.0
    HIGH_RISK_THRESHOLD: float = 60.0
    SUSPICIOUS_RISK_THRESHOLD: float = 40.0
    CAUTION_RISK_THRESHOLD: float = 20.0
    
    # Safety Workflow Target Timeouts (Seconds)
    SAFETY_WORKFLOW_TIMEOUT: int = 180
    EMERGENCY_REPLY_WINDOW_SECONDS: int = 60
    GPS_AGENT_TIMEOUT: int = 25
    BEHAVIOUR_AGENT_TIMEOUT: int = 30
    VOICE_AGENT_TIMEOUT: int = 25
    HEART_RATE_AGENT_TIMEOUT: int = 20
    RISK_FUSION_TIMEOUT: int = 10
    
    # Fusion Weights (must sum to 1.0)
    FUSION_WEIGHTS: Dict[str, float] = {
        "gps": 0.20,
        "behaviour": 0.25,
        "voice": 0.30,
        "heart_rate": 0.15,
        "context": 0.10
    }
    
    # Emergency Service Test Configuration
    EMERGENCY_SERVICE_NUMBER: str = "112"
    AUTO_EMERGENCY_DISPATCH: bool = False  # Requires explicit toggle in settings

settings = AppSettings()
