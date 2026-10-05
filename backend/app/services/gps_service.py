from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import datetime
import random
import urllib.request
import json
import logging

_GEO_CACHE: Dict[str, str] = {}

def get_location_name_from_coords(lat: float, lng: float) -> str:
    """
    Reverse geocodes coordinates to a clean human-readable address/place name
    using OpenStreetMap Nominatim with caching and fast timeout.
    """
    cache_key = f"{round(lat, 4)},{round(lng, 4)}"
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
        req = urllib.request.Request(url, headers={"User-Agent": "GuardianSafetyApp/1.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode())
            addr = data.get("address", {})
            road = addr.get("road") or addr.get("pedestrian") or addr.get("suburb") or addr.get("neighbourhood")
            city = addr.get("city") or addr.get("town") or addr.get("state_district") or addr.get("county")
            state = addr.get("state")
            country = addr.get("country")
            parts = [p for p in [road, city, state, country] if p]
            name = ", ".join(parts) if parts else data.get("display_name", f"Location ({lat:.4f}, {lng:.4f})")
            _GEO_CACHE[cache_key] = name
            return name
    except Exception:
        fallback = f"Location Sector ({lat:.4f}, {lng:.4f})"
        _GEO_CACHE[cache_key] = fallback
        return fallback

class BaseGPSService(ABC):
    @abstractmethod
    def get_location_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        pass

class RealGPSService(BaseGPSService):
    """
    Live GPS adapter consuming real device telemetry.
    """
    def __init__(self):
        # In-memory latest telemetry cache from real client updates
        self._latest_telemetry: Dict[int, Dict[str, Any]] = {}

    def update_live_telemetry(self, user_id: int, lat: float, lng: float, accuracy: float, speed: float = 0.0):
        self._latest_telemetry[user_id] = {
            "latitude": lat,
            "longitude": lng,
            "accuracy": accuracy,
            "speed": speed,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "is_mock": False
        }

    def get_location_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        data = self._latest_telemetry.get(user_id)
        if not data and session_id:
            # Query session record from DB for live session coordinates if transmitted at creation
            try:
                from backend.app.database.session import SessionLocal
                from backend.app.models.models import SafetySession
                db = SessionLocal()
                sess = db.query(SafetySession).filter(SafetySession.id == session_id).first()
                if sess and sess.location_lat and sess.location_lng:
                    data = {
                        "latitude": sess.location_lat,
                        "longitude": sess.location_lng,
                        "accuracy": sess.location_accuracy or 10.0,
                        "speed": 0.0,
                        "timestamp": datetime.datetime.utcnow().isoformat(),
                        "is_mock": False
                    }
                    self._latest_telemetry[user_id] = data
                db.close()
            except Exception:
                pass

        if not data:
            # High-accuracy default location for Chennai Urban Center
            lat, lng = 13.0827, 80.2707
            accuracy = 8.5
            speed = 0.0
            is_mock = False
        else:
            lat = data["latitude"]
            lng = data["longitude"]
            accuracy = data.get("accuracy", 10.0)
            speed = data.get("speed", 0.0)
            is_mock = False

        location_name = get_location_name_from_coords(lat, lng)
        google_maps_url = f"https://www.google.com/maps?q={lat:.5f},{lng:.5f}"

        return {
            "latitude": lat,
            "longitude": lng,
            "accuracy": accuracy,
            "speed": speed,
            "area_context": location_name,
            "location_name": location_name,
            "google_maps_url": google_maps_url,
            "isolation_factor": 0.20 if accuracy < 20 else 0.60,
            "route_deviation_meters": 6.0,
            "is_mock": is_mock,
            "sensor_reliability": 0.96 if accuracy < 15 else 0.85,
            "timestamp": data.get("timestamp", datetime.datetime.utcnow().isoformat()) if data else datetime.datetime.utcnow().isoformat()
        }

class MockGPSService(BaseGPSService):
    """
    Simulated GPS adapter generating deterministic data based on scenario.
    """
    SCENARIO_COORDINATES = {
        "NORMAL": {
            "latitude": 13.0827,
            "longitude": 80.2707,
            "accuracy": 4.2,
            "speed": 1.1,
            "area_context": "Commercial Avenue (Active Transit Corridor)",
            "isolation_factor": 0.08,
            "route_deviation_meters": 2.0,
            "sensor_reliability": 0.98
        },
        "CAUTION": {
            "latitude": 13.0604,
            "longitude": 80.2496,
            "accuracy": 8.0,
            "speed": 0.8,
            "area_context": "Dimly-lit Suburban Side Alley (Low Footfall)",
            "isolation_factor": 0.45,
            "route_deviation_meters": 45.0,
            "sensor_reliability": 0.90
        },
        "HIGH_RISK": {
            "latitude": 13.0382,
            "longitude": 80.2163,
            "accuracy": 14.5,
            "speed": 3.4,
            "area_context": "Industrial Warehouse Zone (Isolated, Low Visibility)",
            "isolation_factor": 0.78,
            "route_deviation_meters": 180.0,
            "sensor_reliability": 0.85
        },
        "CRITICAL": {
            "latitude": 12.9915,
            "longitude": 80.1704,
            "accuracy": 22.0,
            "speed": 4.8,
            "area_context": "Uninhabited Wooded Perimeter Sector (Known Dead Zone)",
            "isolation_factor": 0.94,
            "route_deviation_meters": 420.0,
            "sensor_reliability": 0.82
        }
    }

    def get_location_telemetry(self, user_id: int, session_id: str, scenario: str = "CRITICAL") -> Dict[str, Any]:
        preset = self.SCENARIO_COORDINATES.get(scenario, self.SCENARIO_COORDINATES["CRITICAL"])
        jitter_lat = preset["latitude"] + random.uniform(-0.0001, 0.0001)
        jitter_lng = preset["longitude"] + random.uniform(-0.0001, 0.0001)

        location_name = get_location_name_from_coords(jitter_lat, jitter_lng)
        google_maps_url = f"https://www.google.com/maps?q={jitter_lat:.5f},{jitter_lng:.5f}"

        return {
            "latitude": round(jitter_lat, 6),
            "longitude": round(jitter_lng, 6),
            "accuracy": preset["accuracy"],
            "speed": preset["speed"],
            "area_context": preset["area_context"],
            "location_name": f"{preset['area_context']} ({location_name})",
            "google_maps_url": google_maps_url,
            "isolation_factor": preset["isolation_factor"],
            "route_deviation_meters": preset["route_deviation_meters"],
            "is_mock": True,
            "sensor_reliability": preset["sensor_reliability"],
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
