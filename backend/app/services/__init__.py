from backend.app.services.gps_service import BaseGPSService, RealGPSService, MockGPSService
from backend.app.services.sensor_service import BaseSensorService, RealSensorService, MockSensorService
from backend.app.services.audio_service import BaseAudioService, RealAudioService, MockAudioService
from backend.app.services.watch_service import BaseHeartRateService, RealWatchService, MockWatchService

# Singletons for live adapters to maintain active state/cache across API calls
real_gps_service = RealGPSService()
mock_gps_service = MockGPSService()

real_sensor_service = RealSensorService()
mock_sensor_service = MockSensorService()

real_audio_service = RealAudioService()
mock_audio_service = MockAudioService()

real_watch_service = RealWatchService()
mock_watch_service = MockWatchService()

def get_gps_service(mode: str = "DEMO") -> BaseGPSService:
    return real_gps_service if mode.upper() == "LIVE" else mock_gps_service

def get_sensor_service(mode: str = "DEMO") -> BaseSensorService:
    return real_sensor_service if mode.upper() == "LIVE" else mock_sensor_service

def get_audio_service(mode: str = "DEMO") -> BaseAudioService:
    return real_audio_service if mode.upper() == "LIVE" else mock_audio_service

def get_watch_service(mode: str = "DEMO") -> BaseHeartRateService:
    return real_watch_service if mode.upper() == "LIVE" else mock_watch_service
