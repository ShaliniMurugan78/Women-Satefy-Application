from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel
import datetime

class AgentResult(BaseModel):
    agent_name: str
    status: str # "COMPLETED", "TRIGGERED", "NOT_REQUIRED", "FAILED", "TIMEOUT", "SKIPPED"
    risk_score: float # 0.0 - 100.0
    risk_level: str # "SAFE", "CAUTION", "SUSPICIOUS", "HIGH_RISK", "CRITICAL"
    confidence: float # 0.0 - 1.0
    reasoning: str
    features: Dict[str, Any]
    latency_ms: float
    sensor_reliability: float
    mode: str
    timestamp: str

def score_to_risk_level(score: float) -> str:
    if score >= 80.0:
        return "CRITICAL"
    elif score >= 60.0:
        return "HIGH_RISK"
    elif score >= 40.0:
        return "SUSPICIOUS"
    elif score >= 20.0:
        return "CAUTION"
    return "SAFE"

class BaseAgent(ABC):
    def __init__(self, name: str, threshold: float = 40.0):
        self.name = name
        self.threshold = threshold

    @abstractmethod
    def analyze(self, user_id: int, session_id: str, mode: str = "DEMO", scenario: str = "CRITICAL", context: Optional[Dict[str, Any]] = None) -> AgentResult:
        pass
