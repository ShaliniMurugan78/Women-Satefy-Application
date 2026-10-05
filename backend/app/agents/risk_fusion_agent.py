import time
import datetime
from typing import Dict, Any, List, Optional
from backend.app.config.settings import settings
from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level

class RiskFusionAgent(BaseAgent):
    """
    Risk Assessment Agent: Synthesizes multi-modal evidence from GPS, Behaviour,
    Voice, and Panic Gesture agents to calculate overall state
    (SAFE, CAUTION, SUSPICIOUS, HIGH_RISK, CRITICAL) and provide
    transparent reasoning.

    Panic Gesture is treated as the strongest individual signal:
    a confirmed gesture (score >= 80) alone forces at least HIGH_RISK and
    combined with any other elevated signal forces CRITICAL.
    """
    def __init__(self):
        super().__init__(name="RISK_FUSION_AGENT", threshold=settings.CRITICAL_RISK_THRESHOLD)

    def fuse(
        self,
        user_id: int,
        session_id: str,
        mode: str,
        results: Dict[str, AgentResult],
        context_score: float = 20.0,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> AgentResult:
        start_time = time.perf_counter()

        weights = custom_weights or {
            "gps":           0.20,
            "behaviour":     0.25,
            "voice":         0.25,
            "panic_gesture": 0.30,   # Highest weight — deliberate user intent signal
        }

        # Extract agent scores and confidences
        gps_res    = results.get("GPS_AGENT")
        beh_res    = results.get("BEHAVIOUR_AGENT")
        voc_res    = results.get("VOICE_AGENT")
        panic_res  = results.get("PANIC_GESTURE_AGENT")

        gps_score    = gps_res.risk_score   if gps_res   else 10.0
        beh_score    = beh_res.risk_score   if beh_res   else 10.0
        voc_score    = voc_res.risk_score   if voc_res   else 10.0
        panic_score  = panic_res.risk_score if panic_res else 10.0

        gps_conf     = gps_res.confidence   if gps_res   else 0.5
        beh_conf     = beh_res.confidence   if beh_res   else 0.5
        voc_conf     = voc_res.confidence   if voc_res   else 0.5
        panic_conf   = panic_res.confidence if panic_res else 0.5

        # ── Was a panic gesture explicitly triggered? ──────────────────────
        panic_triggered = (
            panic_res is not None and
            panic_res.features.get("panic_triggered", False)
        )
        trigger_label   = (
            panic_res.features.get("trigger_label", "No Gesture")
            if panic_res else "No Gesture"
        )
        trigger_type    = (
            panic_res.features.get("trigger_type", "NONE")
            if panic_res else "NONE"
        )

        # ── Identify high-risk signals across all modalities ─────────────
        high_risk_modalities: List[str] = []
        if gps_score   >= 60.0: high_risk_modalities.append("GPS (Spatial Isolation)")
        if beh_score   >= 60.0: high_risk_modalities.append("Behaviour (Kinematic Anomaly)")
        if voc_score   >= 60.0: high_risk_modalities.append("Voice (Acoustic Distress)")
        if panic_score >= 60.0: high_risk_modalities.append(f"Panic Gesture ({trigger_label})")

        corroboration_count = len(high_risk_modalities)

        # ── Weighted base score ───────────────────────────────────────────
        base_weighted = (
            (gps_score   * weights.get("gps",           0.20)) +
            (beh_score   * weights.get("behaviour",     0.25)) +
            (voc_score   * weights.get("voice",         0.25)) +
            (panic_score * weights.get("panic_gesture", 0.30))
        )

        # ── Consensus Amplification ───────────────────────────────────────
        if corroboration_count >= 3:
            fused_score = min(100.0, base_weighted * 1.15 + 5.0)
        elif corroboration_count == 2:
            fused_score = min(95.0, base_weighted * 1.05)
        elif corroboration_count == 1:
            fused_score = min(58.0, base_weighted * 0.85)
        else:
            fused_score = base_weighted

        # ── Direct panic override: confirmed gesture is a strong safety signal ──
        # When panic gesture is triggered, immediately assign CRITICAL risk level
        # (score >= 95, confidence >= 0.95) and directly trigger emergency escalation.
        if panic_triggered:
            fused_score = max(fused_score, 96.0)

        final_score = round(fused_score, 1)

        # ── State classification ──────────────────────────────────────────
        if final_score >= 80.0:
            risk_state = "CRITICAL"
        elif final_score >= 60.0:
            risk_state = "HIGH_RISK"
        elif final_score >= 40.0:
            risk_state = "SUSPICIOUS"
        elif final_score >= 25.0:
            risk_state = "CAUTION"
        else:
            risk_state = "SAFE"

        # ── Multi-modal breakdown ─────────────────────────────────────────
        modalities_breakdown = {
            "GPS":           gps_res.risk_level   if gps_res   else "SAFE",
            "Behaviour":     beh_res.risk_level   if beh_res   else "SAFE",
            "Voice":         voc_res.risk_level   if voc_res   else "SAFE",
            "Panic Gesture": panic_res.risk_level if panic_res else "SAFE",
        }

        breakdown_text = (
            f"GPS: {modalities_breakdown['GPS']} | "
            f"Behaviour: {modalities_breakdown['Behaviour']} | "
            f"Voice: {modalities_breakdown['Voice']} | "
            f"Panic Gesture: {modalities_breakdown['Panic Gesture']}"
            + (f" [{trigger_label}]" if panic_triggered else "")
        )

        if risk_state == "CRITICAL":
            reasoning = (
                f"CRITICAL MULTI-MODAL CONSENSUS ({breakdown_text}) → Overall: CRITICAL. "
                + ("Deliberate panic gesture confirmed — " if panic_triggered else "")
                + "Emergency escalation authorized."
            )
        elif risk_state == "HIGH_RISK":
            reasoning = (
                f"HIGH RISK EVALUATION ({breakdown_text}) → Overall: HIGH RISK. "
                + ("Panic gesture registered — " if panic_triggered else "")
                + "Guardian vigilance heightened."
            )
        elif risk_state == "SUSPICIOUS":
            reasoning = f"SUSPICIOUS ACTIVITY ({breakdown_text}) → Overall: SUSPICIOUS. Extended sensor monitoring active."
        elif risk_state == "CAUTION":
            reasoning = f"CAUTION STATE ({breakdown_text}) → Overall: CAUTION. Minor environmental or kinetic variance."
        else:
            reasoning = f"NOMINAL SAFE STATE ({breakdown_text}) → All spatial, acoustic, kinematic and gesture signals safe."

        avg_conf = (gps_conf + beh_conf + voc_conf + panic_conf) / 4.0
        overall_confidence = (
            0.98 if panic_triggered else round(
                max(0.65, min(0.99, avg_conf + (0.05 if corroboration_count >= 2 else 0.0))),
                2
            )
        )
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return AgentResult(
            agent_name=self.name,
            status="COMPLETED",
            risk_score=final_score,
            risk_level=risk_state,
            confidence=overall_confidence,
            reasoning=reasoning,
            features={
                "weighted_base_score":          round(base_weighted, 1),
                "corroboration_count":          corroboration_count,
                "high_risk_signals":            high_risk_modalities,
                "modalities_breakdown":         modalities_breakdown,
                "breakdown_summary":            breakdown_text,
                "gps_score":                    gps_score,
                "behaviour_score":              beh_score,
                "voice_score":                  voc_score,
                "panic_gesture_score":          panic_score,
                "panic_triggered":              panic_triggered,
                "panic_trigger_type":           trigger_type,
                "panic_trigger_label":          trigger_label,
                "direct_escalation_triggered":  panic_triggered and corroboration_count >= 1,
                "emergency_escalation_required": risk_state == "CRITICAL",
            },
            latency_ms=latency_ms,
            sensor_reliability=round((gps_conf + panic_conf) / 2.0, 2),
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat()
        )

    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        return self.fuse(user_id=user_id, session_id=session_id, mode=mode, results={})
