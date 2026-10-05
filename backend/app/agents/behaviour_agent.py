import time
import datetime
import math
from typing import Dict, Any, Optional
from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level
from backend.app.services import get_sensor_service

class BehaviourAgent(BaseAgent):
    """
    Behavioural Agent: Evaluates real-time kinematics from connected BLE Wearable
    or smartphone accelerometer/gyroscope.
    """
    def __init__(self, threshold: float = 40.0):
        super().__init__(name="BEHAVIOUR_AGENT", threshold=threshold)

    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        start_time = time.perf_counter()
        
        sensor_service = get_sensor_service(mode=mode)
        telemetry = sensor_service.get_motion_telemetry(user_id=user_id, session_id=session_id, scenario=scenario)

        motion_detected = telemetry.get("motion_detected", True)
        bluetooth_paired = telemetry.get("bluetooth_paired", False)
        classification = telemetry.get("movement_classification", "UNKNOWN")
        motion_description = telemetry.get("motion_description", classification)
        
        ax = telemetry.get("accel_x", 0.0)
        ay = telemetry.get("accel_y", 0.0)
        az = telemetry.get("accel_z", 9.8 if motion_detected else 0.0)
        mag = telemetry.get("accel_magnitude", math.sqrt(ax*ax + ay*ay + az*az) if motion_detected else 0.0)
        gyro_z = telemetry.get("gyro_z", 0.0)
        impact = telemetry.get("impact_detected", False)
        abnormal = telemetry.get("abnormal_pattern_detected", False)
        reliability = telemetry.get("sensor_reliability", 0.95)

        movement_status = "Normal"

        if not motion_detected and mode.upper() == "LIVE":
            risk_score = 25.0
            movement_status = "Not Detected"
            reasoning = "Motion cannot be detected: Bluetooth smartwatch is not paired and device motion sensor is inactive."
            confidence = 0.60
        elif impact or mag >= 25.0:
            classification = "Fall / High-G Impact"
            movement_status = "Suspicious"
            risk_score = 92.0
            reasoning = f"Critical kinetic anomaly: Severe shock/fall impact ({mag:.1f} m/s²) detected."
            confidence = 0.95
        elif abnormal and mag > 16.0:
            classification = "Fast / Erratic Movement"
            movement_status = "Suspicious"
            risk_score = 75.0
            reasoning = f"High evasive kinetic pattern: Sudden angular jerk and erratic bursts ({mag:.1f} m/s²)."
            confidence = 0.90
        elif mag > 13.0:
            classification = "Running"
            movement_status = "Normal"
            risk_score = 20.0
            reasoning = f"Steady kinetic signature: Aerobic running pace ({mag:.1f} m/s²)."
            confidence = 0.92
        elif mag > 10.4:
            classification = "Walking"
            movement_status = "Normal"
            risk_score = 10.0
            reasoning = f"Nominal locomotion: Steady walking gait ({mag:.1f} m/s²)."
            confidence = 0.94
        else:
            classification = "Stationary"
            movement_status = "Normal"
            risk_score = 8.0
            reasoning = f"Stationary posture: Gravity-aligned accelerometer resting baseline ({mag:.1f} m/s²)."
            confidence = 0.90

        # Scenario override for DEMO mode
        if mode.upper() == "DEMO":
            if scenario == "NORMAL":
                risk_score = 10.0
                movement_status = "Normal"
                classification = "Normal Walking"
                reasoning = "Demonstration Mode: Stable simulated walking gait."
            elif scenario == "CAUTION":
                risk_score = 42.0
                movement_status = "Unusual"
                classification = "Fast / Unusual Movement"
                reasoning = "Demonstration Mode: Fast, erratic pacing movement pattern."
            elif scenario in ["HIGH_RISK", "CRITICAL"]:
                risk_score = 88.0
                movement_status = "Suspicious"
                classification = "Suspicious Fall / Struggle Movement"
                reasoning = "Demonstration Mode: High-G physical struggle deceleration impact (27.8 m/s²)."

        risk_level = score_to_risk_level(risk_score)
        confidence = round(max(0.60, min(0.98, reliability * 0.96)), 2)
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        
        trigger_next = True

        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            features={
                "motion_detected": motion_detected,
                "bluetooth_paired": bluetooth_paired,
                "movement_classification": classification,
                "motion_description": motion_description,
                "accel_x": round(ax, 2),
                "accel_y": round(ay, 2),
                "accel_z": round(az, 2),
                "accel_magnitude": round(mag, 2),
                "gyro_angular_rate": round(gyro_z, 2),
                "movement_status": movement_status,
                "impact_detected": impact or mag >= 25.0,
                "trigger_next_agent": trigger_next,
                "threshold_exceeded": risk_score >= self.threshold
            },
            latency_ms=latency_ms,
            sensor_reliability=reliability,
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
