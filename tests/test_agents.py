import pytest
from backend.app.agents.gps_agent import GPSAgent
from backend.app.agents.behaviour_agent import BehaviourAgent
from backend.app.agents.voice_agent import VoiceAgent
from backend.app.agents.panic_gesture_agent import PanicGestureAgent
from backend.app.agents.risk_fusion_agent import RiskFusionAgent

def test_gps_agent_scenarios():
    agent = GPSAgent()
    
    # Normal scenario
    res_normal = agent.analyze(user_id=1, session_id="test-1", mode="DEMO", scenario="NORMAL")
    assert res_normal.risk_level == "SAFE" or res_normal.risk_score < 30.0
    assert res_normal.status == "COMPLETED"
    
    # Critical scenario
    res_crit = agent.analyze(user_id=1, session_id="test-2", mode="DEMO", scenario="CRITICAL")
    assert res_crit.risk_score >= 60.0
    assert "isolation" in res_crit.reasoning.lower() or "isolated" in res_crit.reasoning.lower()

def test_behaviour_agent_scenarios():
    agent = BehaviourAgent()
    
    res_normal = agent.analyze(user_id=1, session_id="test-1", mode="DEMO", scenario="NORMAL")
    assert res_normal.risk_score <= 25.0
    
    res_crit = agent.analyze(user_id=1, session_id="test-2", mode="DEMO", scenario="CRITICAL")
    assert res_crit.risk_score >= 75.0
    assert res_crit.features.get("impact_detected") == True

def test_voice_agent_scenarios():
    agent = VoiceAgent()
    
    res_normal = agent.analyze(user_id=1, session_id="test-1", mode="DEMO", scenario="NORMAL")
    assert res_normal.risk_score <= 20.0
    
    res_crit = agent.analyze(user_id=1, session_id="test-2", mode="DEMO", scenario="CRITICAL")
    assert res_crit.risk_score >= 80.0
    assert res_crit.features.get("high_pitch_scream_detected") == True

def test_panic_gesture_agent_scenarios():
    agent = PanicGestureAgent()
    
    res_normal = agent.analyze(user_id=1, session_id="test-1", mode="DEMO", scenario="NORMAL")
    assert res_normal.risk_score <= 20.0
    assert res_normal.features.get("panic_triggered") is False
    assert res_normal.features.get("shake_count") == 0
    
    res_crit = agent.analyze(user_id=1, session_id="test-2", mode="DEMO", scenario="CRITICAL")
    assert res_crit.risk_score >= 85.0
    assert res_crit.features.get("panic_triggered") is True
    assert res_crit.features.get("shake_count") == 3
    assert "shake" in res_crit.reasoning.lower()

def test_risk_fusion_synthesis():
    gps = GPSAgent().analyze(user_id=1, session_id="t", mode="DEMO", scenario="CRITICAL")
    beh = BehaviourAgent().analyze(user_id=1, session_id="t", mode="DEMO", scenario="CRITICAL")
    voc = VoiceAgent().analyze(user_id=1, session_id="t", mode="DEMO", scenario="CRITICAL")
    panic = PanicGestureAgent().analyze(user_id=1, session_id="t", mode="DEMO", scenario="CRITICAL")

    fusion_agent = RiskFusionAgent()
    res = fusion_agent.fuse(user_id=1, session_id="t", mode="DEMO", results={
        "GPS_AGENT": gps,
        "BEHAVIOUR_AGENT": beh,
        "VOICE_AGENT": voc,
        "PANIC_GESTURE_AGENT": panic
    }, context_score=80.0)

    assert res.risk_score >= 80.0
    assert res.risk_level == "CRITICAL"
    assert res.features.get("emergency_escalation_required") == True
    assert "CRITICAL" in res.reasoning
