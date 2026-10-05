import time
import datetime
from typing import Dict, Any, Optional
from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level
from backend.app.services import get_audio_service

class VoiceAgent(BaseAgent):
    """
    Voice Agent: Analyzes environmental acoustic spectrum, screaming pitch,
    decibel surges, and distress keywords upon event trigger.
    """
    def __init__(self, threshold: float = 40.0):
        super().__init__(name="VOICE_AGENT", threshold=threshold)

    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        start_time = time.perf_counter()

        audio_service = get_audio_service(mode=mode)
        telemetry = audio_service.analyze_audio_window(user_id=user_id, session_id=session_id, duration_sec=10, scenario=scenario)

        rms = telemetry.get("rms_volume", 0.04)
        peak_freq = telemetry.get("peak_frequency_hz", 350.0)
        keywords = telemetry.get("distress_keywords_detected", [])
        is_scream = telemetry.get("high_pitch_scream_detected", False) or peak_freq > 1100.0
        is_surge = telemetry.get("acoustic_energy_surge", False) or rms > 0.40
        reliability = telemetry.get("sensor_reliability", 0.95)

        # Classify audio into Normal / Suspicious / Distress (distinguishing silence, nearby voices, and distress)
        audio_status = "Detected"
        if (is_scream and len(keywords) > 0) or (len(keywords) > 0 and is_surge):
            audio_classification = "Distress"
            risk_score = 95.0
            reasoning = f"Severe distress vocalization: Distress keywords ({', '.join(keywords)}) and high-frequency scream spike ({int(peak_freq)}Hz) confirmed. 10s audio captured."
        elif is_scream or len(keywords) > 0:
            audio_classification = "Distress"
            risk_score = 80.0
            kw_str = f"keyword '{keywords[0]}'" if keywords else f"shriek frequency ({int(peak_freq)}Hz)"
            reasoning = f"Distress acoustic signature: Detected {kw_str} with elevated volume ({int(rms*100)}%). 10s audio captured."
        elif is_surge:
            audio_classification = "Suspicious"
            risk_score = 50.0
            reasoning = f"Acoustic surge warning: Sudden ambient volume spike ({int(rms*100)}% RMS) detected. 10s audio captured."
        elif rms > 0.05:
            audio_classification = "Normal"
            risk_score = 15.0
            reasoning = f"Nearby ambient voice/sound detected: Conversational level at {int(rms*100)}% RMS ({int(peak_freq)}Hz). 10-second acoustic recording stored for audit."
        else:
            audio_classification = "Normal"
            risk_score = 5.0
            reasoning = f"Ambient acoustic silence/calm detected: Low background volume ({int(rms*100)}% RMS). 10-second acoustic recording stored for audit."

        if mode.upper() in ["DEMO", "HYBRID"]:
            if scenario == "NORMAL":
                risk_score = 10.0
                audio_classification = "Normal"
                reasoning = "Hybrid Demo Mode: Simulated calm ambient background acoustics (10s)."
            elif scenario == "CAUTION":
                risk_score = 45.0
                audio_classification = "Suspicious"
                reasoning = "Hybrid Demo Mode: Simulated elevated environmental background noise (10s)."
            elif scenario in ["HIGH_RISK", "CRITICAL"]:
                risk_score = 88.0
                audio_classification = "Distress"
                reasoning = "Hybrid Demo Mode: Simulated distress keywords and high-frequency scream detected (10s)."

        risk_level = score_to_risk_level(risk_score)
        confidence = round(max(0.70, min(0.98, reliability * 0.95)), 2)
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Trigger Heart Rate Agent if audio condition indicates risk
        trigger_next = risk_score >= self.threshold or audio_classification in ["Distress", "Suspicious"] or mode.upper() in ["DEMO", "HYBRID"]

        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            features={
                "rms_volume": round(rms, 3),
                "peak_frequency_hz": round(peak_freq, 1),
                "distress_keywords_detected": keywords,
                "high_pitch_scream_detected": is_scream,
                "acoustic_energy_surge": is_surge,
                "audio_status": audio_status,
                "audio_classification": audio_classification,
                "audio_stream_url": telemetry.get("audio_stream_url"),
                "recording_id": telemetry.get("recording_id"),
                "trigger_next_agent": trigger_next,
                "threshold_exceeded": risk_score >= self.threshold
            },
            latency_ms=latency_ms,
            sensor_reliability=reliability,
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
