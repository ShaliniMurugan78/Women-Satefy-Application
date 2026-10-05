import datetime
from typing import Dict, Any

class DemoScenarioEngine:
    """
    Demo Scenario Engine:
    Generates controlled, realistic simulated inputs for the 3 distinct scenarios:
      1. Scenario 1 — Safe Journey (GPS Safe, Normal Walking, Normal Environment Audio, HR 82 BPM -> SAFE)
      2. Scenario 2 — Suspicious Situation (GPS Isolated Alley, Fast/Unusual Movement, Suspicious Noise Audio, HR 105 BPM -> HIGH RISK)
      3. Scenario 3 — Critical Emergency (GPS Isolated Location, Suspicious Fall/Struggle Movement, Distress Scream Audio, HR 145 BPM -> CRITICAL)

    Crucial: These inputs are fed directly into the SAME actual agents (GPSAgent, BehaviourAgent, VoiceAgent, HeartRateAgent, RiskFusionAgent)
    which perform real mathematical scoring.
    """

    SCENARIOS = {
        "NORMAL": {
            "name": "Scenario 1 — Safe Journey",
            "target_result": "SAFE",
            "gps": {
                "latitude": 13.0827,
                "longitude": 80.2707,
                "accuracy": 8.0,
                "speed": 1.2,
                "isolation_factor": 0.10,
                "route_deviation_meters": 0.0,
                "area_context": "Active Public Transit Corridor (Monitored)"
            },
            "motion": {
                "accel_x": 0.8,
                "accel_y": 1.4,
                "accel_z": 9.8,
                "accel_magnitude": 10.1,
                "gyro_z": 0.3,
                "movement_classification": "Normal Walking",
                "impact_detected": False,
                "abnormal_pattern_detected": False
            },
            "audio": {
                "file": "normal_environment.wav",
                "rms_volume": 0.05,
                "peak_frequency_hz": 320.0,
                "distress_keywords": [],
                "high_pitch_scream": False
            },
            "wearable": {
                "device_name": "Demo Smartwatch",
                "heart_rate": 82.0,
                "activity": "Normal Walking",
                "accel": 1.4,
                "status": "Normal"
            }
        },
        "CAUTION": {
            "name": "Scenario 2 — Suspicious Situation",
            "target_result": "HIGH RISK",
            "gps": {
                "latitude": 13.0780,
                "longitude": 80.2640,
                "accuracy": 14.0,
                "speed": 2.4,
                "isolation_factor": 0.65,
                "route_deviation_meters": 110.0,
                "area_context": "Isolated Alley / Unlit Perimeter"
            },
            "motion": {
                "accel_x": 3.8,
                "accel_y": 4.5,
                "accel_z": 10.5,
                "accel_magnitude": 12.8,
                "gyro_z": 2.8,
                "movement_classification": "Fast / Unusual Movement",
                "impact_detected": False,
                "abnormal_pattern_detected": True
            },
            "audio": {
                "file": "suspicious_noise.wav",
                "rms_volume": 0.35,
                "peak_frequency_hz": 680.0,
                "distress_keywords": [],
                "high_pitch_scream": False
            },
            "wearable": {
                "device_name": "Demo Smartwatch",
                "heart_rate": 105.0,
                "activity": "Fast Movement / Pacing",
                "accel": 3.8,
                "status": "Elevated"
            }
        },
        "HIGH_RISK": {
            "name": "Scenario 2 — Suspicious Situation",
            "target_result": "HIGH RISK",
            "gps": {
                "latitude": 13.0780,
                "longitude": 80.2640,
                "accuracy": 14.0,
                "speed": 2.4,
                "isolation_factor": 0.65,
                "route_deviation_meters": 110.0,
                "area_context": "Isolated Alley / Unlit Perimeter"
            },
            "motion": {
                "accel_x": 3.8,
                "accel_y": 4.5,
                "accel_z": 10.5,
                "accel_magnitude": 12.8,
                "gyro_z": 2.8,
                "movement_classification": "Fast / Unusual Movement",
                "impact_detected": False,
                "abnormal_pattern_detected": True
            },
            "audio": {
                "file": "suspicious_noise.wav",
                "rms_volume": 0.35,
                "peak_frequency_hz": 680.0,
                "distress_keywords": [],
                "high_pitch_scream": False
            },
            "wearable": {
                "device_name": "Demo Smartwatch",
                "heart_rate": 105.0,
                "activity": "Fast Movement / Pacing",
                "accel": 3.8,
                "status": "Elevated"
            }
        },
        "CRITICAL": {
            "name": "Scenario 3 — Critical Emergency",
            "target_result": "CRITICAL",
            "gps": {
                "latitude": 13.0645,
                "longitude": 80.2520,
                "accuracy": 18.0,
                "speed": 0.2,
                "isolation_factor": 0.90,
                "route_deviation_meters": 260.0,
                "area_context": "High-Risk Isolated Sector (Zero Transit)"
            },
            "motion": {
                "accel_x": 7.5,
                "accel_y": 14.2,
                "accel_z": 22.8,
                "accel_magnitude": 27.8,
                "gyro_z": 5.4,
                "movement_classification": "Suspicious Fall / Struggle Movement",
                "impact_detected": True,
                "abnormal_pattern_detected": True
            },
            "audio": {
                "file": "distress_sound.wav",
                "rms_volume": 0.78,
                "peak_frequency_hz": 1650.0,
                "distress_keywords": ["help", "stop"],
                "high_pitch_scream": True
            },
            "wearable": {
                "device_name": "Demo Smartwatch",
                "heart_rate": 145.0,
                "activity": "Acute Tachycardia / Struggle",
                "accel": 18.5,
                "status": "Abnormal"
            }
        }
    }

    @classmethod
    def get_scenario_data(cls, scenario: str) -> Dict[str, Any]:
        key = scenario.upper() if scenario else "CRITICAL"
        return cls.SCENARIOS.get(key, cls.SCENARIOS["CRITICAL"])

demo_scenario_engine = DemoScenarioEngine()
