"""
Panic Gesture Agent — Comprehensive Test Suite
===============================================
Tests:
  1.  DEMO mode — all 4 scenarios (NORMAL / CAUTION / HIGH_RISK / CRITICAL)
  2.  LIVE mode — no event → MONITORING / low score
  3.  LIVE mode — SHAKE_X3 injected → PANIC_TRIGGERED / high score
  4.  LIVE mode — RAPID_TAP_SOS injected → PANIC_TRIGGERED + correct label
  5.  LIVE mode — VOLUME_LONG_PRESS injected → PANIC_TRIGGERED + correct label
  6.  LIVE mode — partial shake (count=1) → NOT triggered
  7.  HYBRID mode — real panic event takes priority over demo scenario
  8.  Trigger type propagation — trigger_type field matches injected event
  9.  update_live_panic / clear_live_panic helpers
  10. Telemetry REST endpoint — POST /api/safety/telemetry/panic
"""

import pytest
from backend.app.agents.panic_gesture_agent import (
    PanicGestureAgent,
    update_live_panic,
    get_live_panic,
    clear_live_panic,
)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

USER_ID = 99
SESSION = "TEST-PANIC-001"


@pytest.fixture(autouse=True)
def clear_store():
    """Ensure the live panic store is clean before and after every test."""
    clear_live_panic(USER_ID)
    yield
    clear_live_panic(USER_ID)


@pytest.fixture
def agent():
    return PanicGestureAgent(threshold=40.0, wait_timeout=20.0)


# ─────────────────────────────────────────────────────────────────────────────
# 1. DEMO mode — all 4 scenarios
# ─────────────────────────────────────────────────────────────────────────────

class TestDemoMode:
    def test_normal_scenario(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="DEMO", scenario="NORMAL")
        assert res.status == "COMPLETED"
        assert res.risk_score <= 10.0
        assert res.features["panic_triggered"] is False
        assert res.features["shake_count"] == 0
        assert res.features["agent_state"] == "MONITORING"

    def test_caution_scenario(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="DEMO", scenario="CAUTION")
        assert 10.0 < res.risk_score < 40.0
        assert res.features["panic_triggered"] is False
        assert res.features["shake_count"] == 1
        assert res.features["agent_state"] == "DETECTING"

    def test_high_risk_scenario(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="DEMO", scenario="HIGH_RISK")
        assert 40.0 < res.risk_score < 80.0
        assert res.features["panic_triggered"] is False
        assert res.features["shake_count"] == 2
        assert res.features["agent_state"] == "DETECTING"

    def test_critical_scenario(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="DEMO", scenario="CRITICAL")
        assert res.risk_score >= 90.0
        assert res.features["panic_triggered"] is True
        assert res.features["shake_count"] == 3
        assert res.features["agent_state"] == "PANIC_TRIGGERED"
        assert "shake" in res.reasoning.lower()

    def test_demo_source_tag(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="DEMO", scenario="CRITICAL")
        assert res.features["source"] == "DEMO SIMULATION"
        assert res.mode == "DEMO"


# ─────────────────────────────────────────────────────────────────────────────
# 2. LIVE mode — no event present
# ─────────────────────────────────────────────────────────────────────────────

class TestLiveModeNoEvent:
    def test_returns_monitoring_when_no_event(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.status == "COMPLETED"
        assert res.features["agent_state"] == "MONITORING"
        assert res.features["panic_triggered"] is False
        assert res.risk_score < 20.0

    def test_source_is_real_accelerometer(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["source"] == "REAL PHONE ACCELEROMETER"
        assert res.mode == "LIVE"


# ─────────────────────────────────────────────────────────────────────────────
# 3. LIVE mode — SHAKE_X3 fully triggered
# ─────────────────────────────────────────────────────────────────────────────

class TestLiveModeShakeX3:
    def test_shake_x3_triggers_panic(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 24.8,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["panic_triggered"] is True
        assert res.features["agent_state"] == "PANIC_TRIGGERED"
        assert res.risk_score >= 90.0
        assert res.confidence >= 0.95

    def test_shake_x3_label(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 22.0,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        label = res.features["trigger_label"]
        assert "shake" in label.lower(), f"Expected shake label, got: {label}"

    def test_shake_x3_trigger_type_propagated(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 22.0,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["trigger_type"] == "SHAKE_X3"

    def test_peak_magnitude_propagated(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 31.5,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["peak_magnitude"] == 31.5


# ─────────────────────────────────────────────────────────────────────────────
# 4. LIVE mode — RAPID_TAP_SOS
# ─────────────────────────────────────────────────────────────────────────────

class TestLiveModeRapidTap:
    def test_rapid_tap_triggers_panic(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "RAPID_TAP_SOS",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 28.5,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["panic_triggered"] is True
        assert res.risk_score >= 90.0

    def test_rapid_tap_label_contains_tap(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "RAPID_TAP_SOS",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 28.5,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        label = res.features["trigger_label"]
        assert "tap" in label.lower(), f"Expected tap label, got: {label}"


# ─────────────────────────────────────────────────────────────────────────────
# 5. LIVE mode — VOLUME_LONG_PRESS
# ─────────────────────────────────────────────────────────────────────────────

class TestLiveModeVolumeLongPress:
    def test_volume_press_triggers_panic(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "VOLUME_LONG_PRESS",
            "shake_count": 1,
            "panic_triggered": True,
            "peak_magnitude": None,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["panic_triggered"] is True
        assert res.risk_score >= 90.0

    def test_volume_press_label(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "VOLUME_LONG_PRESS",
            "shake_count": 1,
            "panic_triggered": True,
            "peak_magnitude": None,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        label = res.features["trigger_label"]
        assert "volume" in label.lower() or "hardware" in label.lower(), \
            f"Expected volume/hardware label, got: {label}"


# ─────────────────────────────────────────────────────────────────────────────
# 6. LIVE mode — partial shake (NOT triggered)
# ─────────────────────────────────────────────────────────────────────────────

class TestLiveModePartialShake:
    def test_partial_shake_count_1_not_triggered(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 1,
            "panic_triggered": False,
            "peak_magnitude": 19.0,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["panic_triggered"] is False
        assert res.features["agent_state"] == "MONITORING"
        assert res.risk_score < 20.0

    def test_partial_shake_count_2_not_triggered(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 2,
            "panic_triggered": False,
            "peak_magnitude": 21.0,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="LIVE")
        assert res.features["panic_triggered"] is False
        assert res.risk_score < 20.0


# ─────────────────────────────────────────────────────────────────────────────
# 7. HYBRID mode
# ─────────────────────────────────────────────────────────────────────────────

class TestHybridMode:
    def test_real_event_overrides_normal_scenario(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 25.0,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="HYBRID", scenario="NORMAL")
        assert res.features["panic_triggered"] is True
        assert res.risk_score >= 90.0
        assert "HYBRID" in res.features["source"]

    def test_no_real_event_falls_back_to_scenario(self, agent):
        res = agent.analyze(USER_ID, SESSION, mode="HYBRID", scenario="CRITICAL")
        assert res.features["panic_triggered"] is True
        assert res.features["source"] == "DEMO SIMULATION"

    def test_hybrid_rapid_tap_label(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "RAPID_TAP_SOS",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 28.5,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="HYBRID", scenario="NORMAL")
        label = res.features["trigger_label"]
        assert "tap" in label.lower(), f"Expected tap label in HYBRID, got: {label}"

    def test_hybrid_volume_label(self, agent):
        update_live_panic(USER_ID, {
            "trigger_type": "VOLUME_LONG_PRESS",
            "shake_count": 1,
            "panic_triggered": True,
            "peak_magnitude": None,
            "timestamp": "2026-09-28T10:00:00Z",
        })
        res = agent.analyze(USER_ID, SESSION, mode="HYBRID", scenario="NORMAL")
        label = res.features["trigger_label"]
        assert "volume" in label.lower() or "hardware" in label.lower(), \
            f"Expected volume/hardware label in HYBRID, got: {label}"


# ─────────────────────────────────────────────────────────────────────────────
# 8. Live store helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestLivePanicStore:
    def test_update_and_get(self):
        event = {"trigger_type": "SHAKE_X3", "shake_count": 3, "panic_triggered": True}
        update_live_panic(USER_ID, event)
        stored = get_live_panic(USER_ID)
        assert stored is not None
        assert stored["panic_triggered"] is True
        assert "received_at" in stored   # timestamp stamped by update_live_panic

    def test_clear_removes_event(self):
        update_live_panic(USER_ID, {"panic_triggered": True})
        clear_live_panic(USER_ID)
        assert get_live_panic(USER_ID) is None

    def test_get_missing_user_returns_none(self):
        assert get_live_panic(99999) is None

    def test_update_overwrites_previous(self):
        update_live_panic(USER_ID, {"panic_triggered": False, "shake_count": 1})
        update_live_panic(USER_ID, {"panic_triggered": True,  "shake_count": 3})
        stored = get_live_panic(USER_ID)
        assert stored["shake_count"] == 3
        assert stored["panic_triggered"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 9. Telemetry REST endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestTelemetryEndpoint:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from backend.app.main import app
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self, client):
        email = "panictest_endpoint@example.com"
        client.post("/api/auth/register", json={
            "email": email, "password": "Test1234!", "full_name": "Panic Tester"
        })
        res = client.post("/api/auth/login", json={"email": email, "password": "Test1234!"})
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_shake_x3_endpoint(self, client, auth_headers):
        payload = {
            "trigger_type": "SHAKE_X3",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 24.5,
            "timestamp": "2026-09-28T10:00:00Z",
        }
        res = client.post("/api/safety/telemetry/panic", json=payload, headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "received"
        assert body["sensor"] == "PANIC_GESTURE"
        assert body["panic_triggered"] is True
        assert body["shake_count"] == 3

    def test_partial_update_accepted(self, client, auth_headers):
        payload = {
            "trigger_type": "SHAKE_X3",
            "shake_count": 2,
            "panic_triggered": False,
            "peak_magnitude": 19.0,
        }
        res = client.post("/api/safety/telemetry/panic", json=payload, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["panic_triggered"] is False

    def test_requires_auth(self, client):
        res = client.post("/api/safety/telemetry/panic", json={
            "trigger_type": "SHAKE_X3", "shake_count": 3, "panic_triggered": True
        })
        assert res.status_code == 401

    def test_rapid_tap_endpoint(self, client, auth_headers):
        payload = {
            "trigger_type": "RAPID_TAP_SOS",
            "shake_count": 3,
            "panic_triggered": True,
            "peak_magnitude": 28.5,
        }
        res = client.post("/api/safety/telemetry/panic", json=payload, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["trigger_type"] == "RAPID_TAP_SOS"
