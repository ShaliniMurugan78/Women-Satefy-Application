import time
import datetime
from typing import Dict, Any, Optional
from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level
from backend.app.services import get_watch_service

class HeartRateAgent(BaseAgent):
    """
    Heart Rate Agent: Evaluates real-time physiological cardiac telemetry
    from connected Bluetooth BLE Smartwatch against baseline and movement context.
    """
    def __init__(self, threshold: float = 40.0):
        super().__init__(name="HEART_RATE_AGENT", threshold=threshold)

    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        start_time = time.perf_counter()

        baseline_bpm = 72.0
        if context and "baseline_bpm" in context:
            baseline_bpm = float(context["baseline_bpm"])

        # Movement context to prevent false positives during exercise
        movement_class = "UNKNOWN"
        if context and "behaviour_features" in context:
            movement_class = context["behaviour_features"].get("movement_classification", "UNKNOWN")

        watch_service = get_watch_service(mode=mode)
        telemetry = watch_service.get_current_heart_rate(
            user_id=user_id,
            session_id=session_id,
            baseline_bpm=baseline_bpm,
            scenario=scenario
        )

        current_hr = telemetry.get("heart_rate", 72.0)
        deviation = telemetry.get("deviation_bpm", current_hr - baseline_bpm)
        pct_increase = telemetry.get("percentage_increase", (deviation / baseline_bpm) * 100.0 if baseline_bpm > 0 else 0.0)
        sensor_connected = telemetry.get("sensor_connected", True)
        status_display = telemetry.get("status_display", f"{int(current_hr)} BPM")
        source_label = telemetry.get("source", "Connected Bluetooth Device")
        reliability = telemetry.get("sensor_reliability", 0.92)

        is_aerobic_exercise = "RUNNING" in movement_class.upper()

        if not sensor_connected and mode.upper() == "LIVE":
            hr_status = "Not Paired"
            risk_score = 25.0
            reasoning = "Bluetooth smartwatch is not paired. Live heart rate cannot be detected. System maintaining calibrated baseline."
            confidence = 0.50
        elif deviation >= 50.0 or current_hr >= 140.0:
            if is_aerobic_exercise:
                hr_status = "Elevated"
                risk_score = 35.0
                reasoning = f"Aerobic cardiovascular exertion: Heart rate ({int(current_hr)} BPM) is elevated consistent with active running."
                confidence = 0.88
            else:
                hr_status = "Abnormal"
                risk_score = 92.0
                reasoning = f"Acute panic tachycardia: Severe heart rate surge ({int(current_hr)} BPM, +{int(pct_increase)}% over baseline {int(baseline_bpm)} BPM)."
                confidence = round(reliability * 0.95, 2)
        elif deviation >= 25.0 or current_hr >= 105.0:
            if is_aerobic_exercise:
                hr_status = "Elevated"
                risk_score = 20.0
                reasoning = f"Active cardio exertion: Heart rate ({int(current_hr)} BPM) matches running pace."
                confidence = 0.90
            else:
                hr_status = "Elevated"
                risk_score = 65.0
                reasoning = f"Elevated autonomic stress: Heart rate ({int(current_hr)} BPM) shows significant elevation (+{int(deviation)} BPM)."
                confidence = round(reliability * 0.92, 2)
        elif deviation >= 12.0:
            hr_status = "Normal"
            risk_score = 30.0
            reasoning = f"Mild cardiac acceleration: Heart rate ({int(current_hr)} BPM) slightly above resting baseline ({int(baseline_bpm)} BPM)."
            confidence = round(reliability * 0.90, 2)
        else:
            hr_status = "Normal"
            risk_score = 10.0
            reasoning = f"Normal resting cardiac rhythm: Heart rate ({int(current_hr)} BPM) matches calibrated baseline ({int(baseline_bpm)} BPM)."
            confidence = round(reliability * 0.96, 2)

        if mode.upper() == "DEMO":
            if scenario == "NORMAL":
                hr_status = "Normal"
                risk_score = 10.0
                reasoning = "Demonstration Mode: Normal resting cardiac rate."
            elif scenario == "CAUTION":
                hr_status = "Elevated"
                risk_score = 42.0
                reasoning = "Demonstration Mode: Mild physiological stress arousal."
            elif scenario in ["HIGH_RISK", "CRITICAL"]:
                hr_status = "Abnormal"
                risk_score = 90.0
                reasoning = "Demonstration Mode: Acute simulated sympathetic panic tachycardia (145 BPM)."

        risk_level = score_to_risk_level(risk_score)
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            features={
                "heart_rate_bpm": int(current_hr),
                "baseline_hr_bpm": int(baseline_bpm),
                "deviation_bpm": round(deviation, 1),
                "percentage_increase": round(pct_increase, 1),
                "heart_rate_status": hr_status,
                "status_display": status_display,
                "is_abnormal_surge": deviation > 35.0 or current_hr > 135.0,
                "source": source_label,
                "sensor_connected": sensor_connected,
                "movement_context": movement_class,
                "threshold_exceeded": risk_score >= self.threshold
            },
            latency_ms=latency_ms,
            sensor_reliability=reliability,
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
