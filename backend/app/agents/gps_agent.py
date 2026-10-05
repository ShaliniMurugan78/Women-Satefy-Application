import time
import datetime
from typing import Dict, Any, Optional
from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level
from backend.app.services import get_gps_service

class GPSAgent(BaseAgent):
    """
    GPS Agent: Evaluates real spatial context, user-defined unsafe zones,
    isolation index, late-night temporal risk, and route deviations.
    """
    def __init__(self, threshold: float = 35.0):
        super().__init__(name="GPS_AGENT", threshold=threshold)

    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        start_time = time.perf_counter()
        
        gps_service = get_gps_service(mode=mode)
        telemetry = gps_service.get_location_telemetry(user_id=user_id, session_id=session_id, scenario=scenario)
        
        lat = telemetry.get("latitude")
        lng = telemetry.get("longitude")
        accuracy = telemetry.get("accuracy", 10.0)
        speed = telemetry.get("speed", 0.0)
        isolation = telemetry.get("isolation_factor", 0.2)
        deviation = telemetry.get("route_deviation_meters", 0.0)
        area_context = telemetry.get("area_context", "Transit Corridor")
        reliability = telemetry.get("sensor_reliability", 0.95)

        # 1. Temporal Analysis (Late night 22:00 to 05:00 UTC/Local adds ambient vulnerability factor)
        current_hour = datetime.datetime.utcnow().hour
        is_late_night = current_hour >= 22 or current_hour <= 5
        temporal_penalty = 15.0 if is_late_night else 0.0

        # 2. Spatial Isolation & Deviation Calculation
        isolation_points = min(50.0, isolation * 50.0)
        deviation_points = min(25.0, (deviation / 200.0) * 25.0) if deviation > 0 else 0.0
        
        # 3. Sensor Quality / Uncertainty Calibration
        uncertainty_penalty = 8.0 if accuracy > 25.0 else 0.0

        # In LIVE mode, if location is acquired and in normal sector without deviation, risk remains baseline
        raw_score = isolation_points + deviation_points + temporal_penalty + uncertainty_penalty
        
        # In DEMO mode, calibrate to scenario expectations
        if mode.upper() == "DEMO":
            if scenario == "NORMAL":
                raw_score = 10.0
            elif scenario == "CAUTION":
                raw_score = 38.0
            elif scenario in ["HIGH_RISK", "CRITICAL"]:
                raw_score = max(68.0, raw_score)

        risk_score = round(min(100.0, max(5.0, raw_score)), 1)
        risk_level = score_to_risk_level(risk_score)
        
        confidence = round(max(0.65, min(0.99, reliability * (0.95 if accuracy < 15.0 else 0.80))), 2)

        # Explainable reasoning with exact Google Maps link
        maps_url = f"https://www.google.com/maps?q={lat:.5f},{lng:.5f}" if (lat and lng) else None
        if risk_score >= 70.0:
            reasoning = f"High spatial risk: Located in isolated sector ({area_context}) at Lat {lat:.5f}, Lng {lng:.5f}. Google Maps: {maps_url}"
        elif risk_score >= 40.0:
            reasoning = f"Moderate location caution: Located at {area_context} (Lat {lat:.5f}, Lng {lng:.5f}). Google Maps: {maps_url}"
        else:
            reasoning = f"Live GPS verified: Lat {lat:.5f}, Lng {lng:.5f} ({area_context}, ±{int(accuracy)}m). Google Maps: {maps_url}"

        # Condition to trigger next agent in pipeline
        trigger_next = risk_score >= self.threshold or mode.upper() in ["DEMO", "HYBRID"]

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            features={
                "latitude": lat,
                "longitude": lng,
                "google_maps_url": maps_url,
                "location_name": area_context,
                "accuracy_meters": accuracy,
                "speed_mps": speed,
                "isolation_factor": isolation,
                "route_deviation_meters": deviation,
                "area_context": area_context,
                "is_late_night": is_late_night,
                "trigger_next_agent": trigger_next,
                "threshold_exceeded": risk_score >= self.threshold
            },
            latency_ms=latency_ms,
            sensor_reliability=reliability,
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
