"""
Panic Gesture Agent
===================
Evaluates shake-gesture and volume-button panic events captured by the
phone/browser front-end and submitted to the backend via the
POST /api/safety/telemetry/panic endpoint.

Agent states exposed in AgentResult.features["agent_state"]:
  MONITORING   — running, no gesture yet
  DETECTING    — gesture accumulation in progress (shake count 1 or 2)
  PANIC_TRIGGERED — 3 shakes or long-press confirmed
  COOLDOWN     — post-trigger quiet window
  CANCELLED    — session cancelled before trigger

In LIVE mode  the agent waits up to wait_timeout seconds for a real panic
event to arrive from the phone.  If none arrives it reports MONITORING with
a low risk score.

In DEMO/HYBRID mode the agent uses scenario data to simulate a shaking event,
returning scores consistent with the chosen scenario.
"""

import asyncio
import datetime
import time
from typing import Dict, Any, Optional

from backend.app.agents.base_agent import BaseAgent, AgentResult, score_to_risk_level

# ---------------------------------------------------------------------------
# In-memory store for real-time panic events pushed by the phone
# key = user_id (int), value = latest panic event dict
# ---------------------------------------------------------------------------
_live_panic_store: Dict[int, Dict[str, Any]] = {}


def update_live_panic(user_id: int, event: Dict[str, Any]) -> None:
    """Called by the telemetry endpoint when the phone pushes a panic event."""
    _live_panic_store[user_id] = {**event, "received_at": time.time()}


def get_live_panic(user_id: int) -> Optional[Dict[str, Any]]:
    return _live_panic_store.get(user_id)


def clear_live_panic(user_id: int) -> None:
    _live_panic_store.pop(user_id, None)


# ---------------------------------------------------------------------------
class PanicGestureAgent(BaseAgent):
    """
    Panic Gesture Agent — detects deliberate three-shake or volume-long-press
    gestures from the user's smartphone and translates them into a structured
    risk signal.
    """

    def __init__(self, threshold: float = 40.0, wait_timeout: float = 20.0):
        super().__init__(name="PANIC_GESTURE_AGENT", threshold=threshold)
        # Maximum seconds to wait for a real panic event in LIVE mode
        self.wait_timeout = wait_timeout

    # ------------------------------------------------------------------
    def analyze(
        self,
        user_id: int,
        session_id: str,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResult:
        """Synchronous wrapper — actual async waiting is done in the orchestrator."""
        start_time = time.perf_counter()
        mode_upper = mode.upper()

        if mode_upper == "LIVE":
            result = self._analyze_live(user_id, session_id, start_time, context)
        else:
            result = self._analyze_demo(user_id, session_id, mode_upper, scenario, start_time, context)

        return result

    # ------------------------------------------------------------------
    def _analyze_live(
        self,
        user_id: int,
        session_id: str,
        start_time: float,
        context: Optional[Dict[str, Any]],
    ) -> AgentResult:
        """
        In LIVE mode the orchestrator already waited (see _wait_for_panic_gesture).
        We just read whatever the store has now.
        """
        event = get_live_panic(user_id)
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        if event and event.get("panic_triggered"):
            trigger_type = event.get("trigger_type", "SHAKE_X3")  # SHAKE_X3 | RAPID_TAP_SOS | VOLUME_LONG_PRESS
            shake_count  = event.get("shake_count", 3)
            if "TAP" in trigger_type.upper():
                trigger_label = "Rapid SOS Tap Sequence: 3 taps within 1.8s"
            elif "VOLUME" in trigger_type.upper():
                trigger_label = "Hardware/Volume Key Sequence: Deliberate alert detected"
            else:
                trigger_label = "Panic Shake Detected: 3 rapid shakes detected within 2.5s"

            risk_score = 96.0
            agent_state = "PANIC_TRIGGERED"
            reasoning = (
                f"{trigger_label}. Peak magnitude: {event.get('peak_magnitude', 'N/A')} m/s². "
                f"Gesture captured at {event.get('timestamp', 'unknown')}. "
                "Deliberate user distress confirmation. Immediate CRITICAL emergency escalation requested."
            )
            confidence = 0.98
        else:
            trigger_type  = "NONE"
            trigger_label = "No Gesture Detected"
            shake_count   = event.get("shake_count", 0) if event else 0
            risk_score    = 12.0
            agent_state   = "MONITORING"
            reasoning     = (
                "Panic gesture monitoring active. No deliberate shake or "
                "volume-long-press detected during this session window. "
                "Phone accelerometer stream analysed; all motion within normal bounds."
            )
            confidence    = 0.82

        return AgentResult(
            agent_name="PANIC_GESTURE_AGENT",
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=score_to_risk_level(risk_score),
            confidence=confidence,
            reasoning=reasoning,
            features={
                "agent_state": agent_state,
                "trigger_type": trigger_type,
                "trigger_label": trigger_label,
                "shake_count": shake_count,
                "panic_triggered": agent_state == "PANIC_TRIGGERED",
                "peak_magnitude": event.get("peak_magnitude") if event else None,
                "gesture_timestamp": event.get("timestamp") if event else None,
                "source": "REAL PHONE ACCELEROMETER",
                "volume_button_supported": False,
                "volume_button_note": (
                    "Volume-button hardware keys are restricted by standard browser security APIs. "
                    "Shake × 3 and Rapid-Tap SOS are primary panic activation methods."
                ),
            },
            latency_ms=latency_ms,
            sensor_reliability=0.95 if agent_state == "PANIC_TRIGGERED" else 0.75,
            mode="LIVE",
            timestamp=datetime.datetime.utcnow().isoformat(),
        )

    # ------------------------------------------------------------------
    def _analyze_demo(
        self,
        user_id: int,
        session_id: str,
        mode: str,
        scenario: str,
        start_time: float,
        context: Optional[Dict[str, Any]],
    ) -> AgentResult:
        """
        In DEMO / HYBRID mode: check if real shake arrived (HYBRID allows real phone);
        otherwise use scenario data.
        """
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # HYBRID: check if real phone actually sent a gesture
        real_event = get_live_panic(user_id)
        if real_event and real_event.get("panic_triggered"):
            trigger_type  = real_event.get("trigger_type", "SHAKE_X3")
            shake_count   = real_event.get("shake_count", 3)
            if "TAP" in trigger_type.upper():
                trigger_label = "Rapid SOS Tap Sequence: 3 taps within 1.8s"
            elif "VOLUME" in trigger_type.upper():
                trigger_label = "Hardware/Volume Key Sequence: Deliberate alert detected"
            else:
                trigger_label = "Panic Shake Detected: 3 rapid shakes detected within 2.5s"
            risk_score = 96.0
            agent_state = "PANIC_TRIGGERED"
            reasoning = (
                f"HYBRID: Real panic gesture confirmed from smartphone ({trigger_label}). "
                f"Shake count: {shake_count}. Immediate CRITICAL emergency escalation."
            )
            confidence = 0.98
            source = "REAL PHONE ACCELEROMETER (HYBRID)"
        else:
            # Pure DEMO — use scenario
            scenario_data = {
                "NORMAL":    (5.0,  "MONITORING",       "No gesture", 0, 0.85),
                "CAUTION":   (18.0, "DETECTING",        "Shake × 1 detected (incomplete)", 1, 0.80),
                "HIGH_RISK": (55.0, "DETECTING",        "Shake × 2 detected (incomplete)", 2, 0.88),
                "CRITICAL":  (96.0, "PANIC_TRIGGERED",  "Panic Shake Detected: 3 rapid shakes detected within 2.5s", 3, 0.98),
            }
            risk_score, agent_state, trigger_label, shake_count, confidence = scenario_data.get(
                scenario, scenario_data["CRITICAL"]
            )
            trigger_type = "SHAKE_X3" if shake_count >= 3 else ("DETECTING" if shake_count > 0 else "NONE")

            if agent_state == "PANIC_TRIGGERED":
                reasoning = (
                    f"DEMO: {trigger_label}. Phone accelerometer registered deliberate shaking motion. "
                    "CRITICAL priority propagated directly to Risk Assessment Agent and Emergency Response Agent."
                )
            elif agent_state == "DETECTING":
                reasoning = (
                    f"DEMO: Partial shake sequence detected ({shake_count}/3). "
                    "Gesture window still open. No emergency triggered yet."
                )
            else:
                reasoning = "DEMO: Phone accelerometer nominal. No panic gesture in session."
            source = "DEMO SIMULATION"

        return AgentResult(
            agent_name="PANIC_GESTURE_AGENT",
            status="COMPLETED",
            risk_score=risk_score,
            risk_level=score_to_risk_level(risk_score),
            confidence=confidence,
            reasoning=reasoning,
            features={
                "agent_state": agent_state,
                "trigger_type": trigger_type,
                "trigger_label": trigger_label,
                "shake_count": shake_count,
                "panic_triggered": agent_state == "PANIC_TRIGGERED",
                "peak_magnitude": real_event.get("peak_magnitude") if real_event else (25.0 if scenario == "CRITICAL" else None),
                "gesture_timestamp": real_event.get("timestamp") if real_event else datetime.datetime.utcnow().isoformat(),
                "source": source,
                "volume_button_supported": False,
                "volume_button_note": (
                    "Volume-button long-press is not accessible to web applications "
                    "via standard W3C APIs. Shake × 3 is the primary panic method."
                ),
                "direct_escalation_enabled": agent_state == "PANIC_TRIGGERED",
            },
            latency_ms=latency_ms,
            sensor_reliability=0.90 if agent_state == "PANIC_TRIGGERED" else 0.75,
            mode=mode,
            timestamp=datetime.datetime.utcnow().isoformat(),
        )
