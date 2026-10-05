from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import datetime
import random

class BaseSensorService(ABC):
    @abstractmethod
    def get_motion_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        pass

class RealSensorService(BaseSensorService):
    """
    Live Motion/Sensor adapter consuming real accelerometer and gyroscope data from device or BLE wearable.
    """
    def __init__(self):
        self._latest_sensor_data: Dict[int, Dict[str, Any]] = {}

    def update_live_motion(
        self,
        user_id: int,
        accel_x: float,
        accel_y: float,
        accel_z: float,
        gyro_x: float = 0.0,
        gyro_y: float = 0.0,
        gyro_z: float = 0.0,
        source: str = "device"
    ):
        mag = (accel_x**2 + accel_y**2 + accel_z**2)**0.5
        self._latest_sensor_data[user_id] = {
            "accel_x": accel_x,
            "accel_y": accel_y,
            "accel_z": accel_z,
            "accel_magnitude": round(mag, 2),
            "gyro_x": gyro_x,
            "gyro_y": gyro_y,
            "gyro_z": gyro_z,
            "source": source,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "is_mock": False
        }

    def get_motion_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        data = self._latest_sensor_data.get(user_id)
        
        # Check if live heart rate or wearable telemetry is streaming from BLE watch
        from backend.app.services import real_watch_service
        is_watch_connected = real_watch_service.is_connected(user_id)

        # If no accelerometer readings received and no smartwatch connected
        if not data and not is_watch_connected:
            return {
                "motion_detected": False,
                "bluetooth_paired": False,
                "movement_classification": "Motion Cannot Be Detected",
                "motion_description": "Motion cannot be detected (Smartwatch not paired, device motion sensor inactive)",
                "accel_x": 0.0,
                "accel_y": 0.0,
                "accel_z": 0.0,
                "accel_magnitude": 0.0,
                "gyro_x": 0.0,
                "gyro_y": 0.0,
                "gyro_z": 0.0,
                "abnormal_pattern_detected": False,
                "impact_detected": False,
                "sensor_reliability": 0.60,
                "is_mock": False,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        
        mag = data.get("accel_magnitude", 9.8) if data else 9.8
        ax = data.get("accel_x", 0.0) if data else 0.0
        ay = data.get("accel_y", 0.0) if data else 0.0
        az = data.get("accel_z", 9.8) if data else 9.8
        gz = data.get("gyro_z", 0.0) if data else 0.0

        is_impact = mag > 24.0 or (mag < 2.5 and mag > 0.1)
        is_abnormal = mag > 16.0 or abs(gz) > 3.0
        
        if is_impact:
            classification = "Fall / Severe Kinetic Shock"
            status_desc = f"Fall / Sudden Impact Detected ({mag:.2f} m/s²)"
        elif is_abnormal:
            classification = "Fast / Erratic Movement"
            status_desc = f"Fast / Erratic Movement ({mag:.2f} m/s²)"
        elif mag > 13.0:
            classification = "Running"
            status_desc = f"Running Pace ({mag:.2f} m/s²)"
        elif mag > 10.4:
            classification = "Walking"
            status_desc = f"Walking Cadence ({mag:.2f} m/s²)"
        else:
            classification = "Stationary"
            status_desc = f"Stationary Baseline ({mag:.2f} m/s²)"

        return {
            "motion_detected": True,
            "bluetooth_paired": is_watch_connected or (data.get("source") == "bluetooth" if data else False),
            "movement_classification": classification,
            "motion_description": status_desc,
            "accel_x": ax,
            "accel_y": ay,
            "accel_z": az,
            "accel_magnitude": mag,
            "gyro_x": data.get("gyro_x", 0.0) if data else 0.0,
            "gyro_y": data.get("gyro_y", 0.0) if data else 0.0,
            "gyro_z": gz,
            "abnormal_pattern_detected": is_abnormal,
            "impact_detected": is_impact,
            "sensor_reliability": 0.95,
            "is_mock": False,
            "timestamp": data.get("timestamp", datetime.datetime.utcnow().isoformat()) if data else datetime.datetime.utcnow().isoformat()
        }

class MockSensorService(BaseSensorService):
    """
    Demo Scenario Motion/Kinematics Generator:
      Scenario 1 -> Normal Walking (Magnitude ~10.1 m/s²)
      Scenario 2 -> Fast / Unusual Movement (Acceleration 3.8 m/s², Mag ~12.8 m/s²)
      Scenario 3 -> Suspicious Fall / Struggle Movement (Impact detected, Mag ~27.8 m/s²)
    """
    SCENARIO_MOTION = {
        "NORMAL": {
            "accel_x": 0.8,
            "accel_y": 1.4,
            "accel_z": 9.8,
            "accel_magnitude": 10.1,
            "gyro_x": 0.04,
            "gyro_y": 0.08,
            "gyro_z": 0.3,
            "movement_classification": "Normal Walking",
            "abnormal_pattern_detected": False,
            "impact_detected": False,
            "sensor_reliability": 0.98
        },
        "CAUTION": {
            "accel_x": 3.8,
            "accel_y": 4.5,
            "accel_z": 10.5,
            "accel_magnitude": 12.8,
            "gyro_x": 0.85,
            "gyro_y": 1.20,
            "gyro_z": 2.8,
            "movement_classification": "Fast / Unusual Movement",
            "abnormal_pattern_detected": True,
            "impact_detected": False,
            "sensor_reliability": 0.95
        },
        "HIGH_RISK": {
            "accel_x": 3.8,
            "accel_y": 4.5,
            "accel_z": 10.5,
            "accel_magnitude": 12.8,
            "gyro_x": 0.85,
            "gyro_y": 1.20,
            "gyro_z": 2.8,
            "movement_classification": "Fast / Unusual Movement",
            "abnormal_pattern_detected": True,
            "impact_detected": False,
            "sensor_reliability": 0.95
        },
        "CRITICAL": {
            "accel_x": 7.5,
            "accel_y": 14.2,
            "accel_z": 22.8,
            "accel_magnitude": 27.8,
            "gyro_x": 4.80,
            "gyro_y": 6.20,
            "gyro_z": 5.4,
            "movement_classification": "Suspicious Movement / Fall Impact",
            "abnormal_pattern_detected": True,
            "impact_detected": True,
            "sensor_reliability": 0.92
        }
    }

    def get_motion_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        preset = self.SCENARIO_MOTION.get(scenario.upper(), self.SCENARIO_MOTION["CRITICAL"])
        jitter = random.uniform(-0.05, 0.05)
        mag = round(preset["accel_magnitude"] + jitter, 2)
        return {
            "motion_detected": True,
            "bluetooth_paired": True,
            "movement_classification": preset["movement_classification"],
            "motion_description": f"{preset['movement_classification']} ({mag} m/s²)",
            "accel_x": preset["accel_x"],
            "accel_y": preset["accel_y"],
            "accel_z": preset["accel_z"],
            "accel_magnitude": mag,
            "gyro_x": preset["gyro_x"],
            "gyro_y": preset["gyro_y"],
            "gyro_z": preset["gyro_z"],
            "abnormal_pattern_detected": preset["abnormal_pattern_detected"],
            "impact_detected": preset["impact_detected"],
            "sensor_reliability": preset["sensor_reliability"],
            "is_mock": True,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
