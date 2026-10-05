import pytest
from backend.app.services import (
    get_gps_service, get_sensor_service, get_audio_service, get_watch_service,
    RealGPSService, MockGPSService,
    RealSensorService, MockSensorService,
    RealAudioService, MockAudioService,
    RealWatchService, MockWatchService
)

def test_service_mode_isolation():
    # Test DEMO mode resolution
    gps_demo = get_gps_service("DEMO")
    sensor_demo = get_sensor_service("DEMO")
    audio_demo = get_audio_service("DEMO")
    watch_demo = get_watch_service("DEMO")

    assert isinstance(gps_demo, MockGPSService)
    assert isinstance(sensor_demo, MockSensorService)
    assert isinstance(audio_demo, MockAudioService)
    assert isinstance(watch_demo, MockWatchService)

    # Test LIVE mode resolution
    gps_live = get_gps_service("LIVE")
    sensor_live = get_sensor_service("LIVE")
    audio_live = get_audio_service("LIVE")
    watch_live = get_watch_service("LIVE")

    assert isinstance(gps_live, RealGPSService)
    assert isinstance(sensor_live, RealSensorService)
    assert isinstance(audio_live, RealAudioService)
    assert isinstance(watch_live, RealWatchService)

def test_telemetry_isolation():
    # Updating live adapter must not pollute demo generator
    gps_live = get_gps_service("LIVE")
    gps_live.update_live_telemetry(user_id=99, lat=40.7128, lng=-74.0060, accuracy=3.0)

    # Query mock service for same user - must return scenario preset, NOT live coordinates
    gps_mock = get_gps_service("DEMO")
    demo_data = gps_mock.get_location_telemetry(user_id=99, session_id="test", scenario="CRITICAL")
    
    assert demo_data["is_mock"] == True
    # Live coordinate lat=40.7128 should NOT be present in demo preset (Chennai region coordinates)
    assert abs(demo_data["latitude"] - 12.9915) < 0.1
