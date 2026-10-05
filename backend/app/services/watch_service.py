from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import datetime
import random

class BaseHeartRateService(ABC):
    @abstractmethod
    def get_current_heart_rate(self, user_id: int, session_id: str, baseline_bpm: float = 72.0, scenario: str = "CRITICAL") -> Dict[str, Any]:
        pass

class RealWatchService(BaseHeartRateService):
    """
    Live Smartwatch Adapter: Consumes BLE Heart Rate Service (GATT standard 0x180D) telemetry.
    """
    def __init__(self):
        self._latest_hr_data: Dict[int, Dict[str, Any]] = {}

    def is_connected(self, user_id: int) -> bool:
        data = self._latest_hr_data.get(user_id)
        if not data:
            return False
        # Consider connected if contact is true or updated recently
        return data.get("sensor_contact", False) or data.get("is_connected", False)

    def update_live_hr(self, user_id: int, hr_bpm: float, activity_state: str = "RESTING", sensor_contact: bool = True):
        self._latest_hr_data[user_id] = {
            "heart_rate": hr_bpm,
            "activity_state": activity_state,
            "sensor_contact": sensor_contact,
            "is_connected": True,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "is_mock": False
        }

    def get_current_heart_rate(self, user_id: int, session_id: str, baseline_bpm: float = 72.0, scenario: str = "CRITICAL") -> Dict[str, Any]:
        data = self._latest_hr_data.get(user_id)
        if not data:
            return {
                "device_name": "Bluetooth BLE Smartwatch",
                "heart_rate": 72.0,
                "baseline_bpm": baseline_bpm,
                "deviation_bpm": 0.0,
                "percentage_increase": 0.0,
                "activity_state": "BASELINE_ESTIMATED",
                "is_abnormal_surge": False,
                "sensor_connected": False,
                "sensor_reliability": 0.65,
                "is_mock": False,
                "source": "Smartwatch Not Paired",
                "status_display": "Bluetooth smartwatch is not paired",
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        
        hr = data.get("heart_rate", 74.0)
        deviation = hr - baseline_bpm
        pct = (deviation / baseline_bpm) * 100.0 if baseline_bpm > 0 else 0.0
        is_surge = deviation > 35.0 or hr > 135.0

        return {
            "device_name": "Connected BLE Smartwatch",
            "heart_rate": hr,
            "baseline_bpm": baseline_bpm,
            "deviation_bpm": round(deviation, 1),
            "percentage_increase": round(pct, 1),
            "activity_state": data.get("activity_state", "MONITORED"),
            "is_abnormal_surge": is_surge,
            "sensor_connected": True,
            "sensor_reliability": 0.98 if data.get("sensor_contact", True) else 0.75,
            "is_mock": False,
            "source": "Connected Bluetooth Device",
            "status_display": f"{int(hr)} BPM (Connected Bluetooth Smartwatch)",
            "timestamp": data.get("timestamp", datetime.datetime.utcnow().isoformat())
        }

class MockWatchService(BaseHeartRateService):
    """
    Virtual Device: Demo Smartwatch (Simulated Bluetooth Sensor Data)
    Scenarios:
      1. Safe Journey -> 82 BPM (Normal Walking)
      2. Suspicious Situation -> 105 BPM (Fast Movement / Anxious)
      3. Critical Emergency -> 145 BPM (Acute Tachycardia)
    """
    SCENARIO_HEART_RATE = {
        "NORMAL": {
            "hr": 82.0,
            "activity_state": "Normal Walking",
            "is_abnormal_surge": False,
            "sensor_connected": True,
            "sensor_reliability": 0.98,
            "status": "Normal"
        },
        "CAUTION": {
            "hr": 105.0,
            "activity_state": "Fast Movement / Pacing",
            "is_abnormal_surge": False,
            "sensor_connected": True,
            "sensor_reliability": 0.95,
            "status": "Elevated"
        },
        "HIGH_RISK": {
            "hr": 105.0,
            "activity_state": "Fast Movement / Pacing",
            "is_abnormal_surge": False,
            "sensor_connected": True,
            "sensor_reliability": 0.95,
            "status": "Elevated"
        },
        "CRITICAL": {
            "hr": 145.0,
            "activity_state": "Acute Panic Tachycardia",
            "is_abnormal_surge": True,
            "sensor_connected": True,
            "sensor_reliability": 0.92,
            "status": "Abnormal"
        }
    }

    def get_current_heart_rate(self, user_id: int, session_id: str, baseline_bpm: float = 72.0, scenario: str = "CRITICAL") -> Dict[str, Any]:
        preset = self.SCENARIO_HEART_RATE.get(scenario.upper(), self.SCENARIO_HEART_RATE["CRITICAL"])
        current_hr = preset["hr"]
        deviation = round(current_hr - baseline_bpm, 1)
        pct = round((deviation / baseline_bpm) * 100.0, 1)

        return {
            "device_name": "Demo Smartwatch",
            "connection_status": "CONNECTED — DEMO",
            "data_source": "SIMULATED SENSOR DATA",
            "heart_rate": current_hr,
            "baseline_bpm": baseline_bpm,
            "deviation_bpm": deviation,
            "percentage_increase": pct,
            "activity_state": preset["activity_state"],
            "is_abnormal_surge": preset["is_abnormal_surge"],
            "sensor_connected": True,
            "sensor_reliability": preset["sensor_reliability"],
            "is_mock": True,
            "source": "Demo Smartwatch (Scenario Telemetry)",
            "status_display": f"{int(current_hr)} BPM ({preset['activity_state']})",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
