import os
import wave
import struct
import math
import datetime
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

class BaseAudioService(ABC):
    @abstractmethod
    def analyze_audio_window(self, user_id: int, session_id: str, duration_sec: int = 6, scenario: str = "CRITICAL") -> Dict[str, Any]:
        pass

class RealAudioService(BaseAudioService):
    """
    Live Audio Adapter: Consumes spectral features transmitted from frontend Web Audio analyzer.
    Preserves user privacy by only transmitting spectral features, not raw recordings.
    """
    def __init__(self):
        self._latest_audio_features: Dict[int, Dict[str, Any]] = {}

    def update_live_audio(
        self,
        user_id: int,
        rms_volume: float,
        peak_frequency_hz: float,
        spectral_centroid: float,
        distress_keyword: bool = False,
        phrase: str = None
    ):
        self._latest_audio_features[user_id] = {
            "rms_volume": rms_volume,
            "peak_frequency_hz": peak_frequency_hz,
            "spectral_centroid": spectral_centroid,
            "distress_keyword": distress_keyword,
            "phrase": phrase,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "is_mock": False
        }

    def analyze_audio_window(self, user_id: int, session_id: str, duration_sec: int = 12, scenario: str = "CRITICAL") -> Dict[str, Any]:
        data = self._latest_audio_features.get(user_id)
        rms = data.get("rms_volume", 0.02) if data else 0.02
        peak_freq = data.get("peak_frequency_hz", 240.0) if data else 240.0
        centroid = data.get("spectral_centroid", 800.0) if data else 800.0
        has_keyword = data.get("distress_keyword", False) if data else False

        audio_stream_url = None
        recording_id = None
        try:
            from backend.app.database.session import SessionLocal
            from backend.app.models.models import AudioRecording
            db = SessionLocal()
            rec = db.query(AudioRecording).filter(AudioRecording.session_id == session_id).order_by(AudioRecording.recorded_at.desc()).first()
            if rec:
                recording_id = rec.id
                audio_stream_url = f"/api/safety/audio/stream/{rec.id}"
                if rec.rms_level is not None and rec.rms_level > 0:
                    rms = rec.rms_level
            db.close()
        except Exception:
            pass

        is_scream = peak_freq > 1100.0 and rms > 0.35
        is_surge = rms > 0.40
        keywords = [data.get("phrase", "help")] if (data and has_keyword) else []

        if is_scream or has_keyword:
            classification = "EXTREME_DISTRESS_VOCALIZATION"
        elif is_surge:
            classification = "ELEVATED_NOISE_SURGE"
        elif rms > 0.04:
            classification = "NEARBY_VOICES_CONVERSATIONAL"
        else:
            classification = "CALM_AMBIENT_SILENCE"

        return {
            "source": "LIVE MICROPHONE",
            "audio_file": None,
            "recording_id": recording_id,
            "audio_stream_url": audio_stream_url,
            "rms_volume": round(rms, 3),
            "peak_frequency_hz": round(peak_freq, 1),
            "spectral_centroid": round(centroid, 1),
            "distress_keywords_detected": keywords,
            "high_pitch_scream_detected": is_scream,
            "acoustic_energy_surge": is_surge,
            "acoustic_classification": classification,
            "sensor_reliability": 0.96,
            "is_mock": False,
            "is_simulated_audio": False,
            "timestamp": data.get("timestamp", datetime.datetime.utcnow().isoformat()) if data else datetime.datetime.utcnow().isoformat()
        }

class MockAudioService(BaseAudioService):
    """
    Demo Scenario Audio Processor:
    Loads authentic .wav files from demo/audio/, performs digital signal processing
    (RMS extraction, Zero Crossing Rate frequency estimation, energy envelope calculations)
    and passes real extracted features to the Voice Agent.
    """
    SCENARIO_FILE_MAP = {
        "NORMAL": "normal_environment.wav",
        "CAUTION": "suspicious_noise.wav",
        "HIGH_RISK": "suspicious_noise.wav",
        "CRITICAL": "distress_sound.wav",
        "SILENCE": "silence.wav"
    }

    def __init__(self):
        self.audio_dir = os.path.join(os.path.dirname(__file__), "..", "..", "demo", "audio")

    def _process_wav_file(self, filename: str) -> Dict[str, Any]:
        filepath = os.path.join(self.audio_dir, filename)
        if not os.path.exists(filepath):
            # Fallback path if working dir differs
            filepath = os.path.join(os.getcwd(), "backend", "demo", "audio", filename)

        if not os.path.exists(filepath):
            # Return nominal fallback
            return {
                "rms": 0.05,
                "peak_freq": 350.0,
                "centroid": 1100.0,
                "is_scream": False,
                "is_surge": False
            }

        try:
            with wave.open(filepath, "rb") as wf:
                framerate = wf.getframerate()
                nframes = wf.getnframes()
                raw_bytes = wf.readframes(nframes)
                
                # Unpack 16-bit PCM frames
                count = len(raw_bytes) // 2
                format_str = f"<{count}h"
                samples = struct.unpack(format_str, raw_bytes)
                
                if not samples:
                    return {"rms": 0.01, "peak_freq": 100.0, "centroid": 500.0, "is_scream": False, "is_surge": False}

                # 1. Calculate Real RMS Energy
                sum_sq = sum((s / 32768.0) ** 2 for s in samples)
                rms = math.sqrt(sum_sq / count)

                # 2. Calculate Zero-Crossing Rate (ZCR) to estimate dominant frequency
                zero_crossings = 0
                for i in range(1, len(samples)):
                    if (samples[i] >= 0 and samples[i - 1] < 0) or (samples[i] < 0 and samples[i - 1] >= 0):
                        zero_crossings += 1

                zcr = zero_crossings / len(samples)
                estimated_freq = zcr * (framerate / 2.0)

                # 3. Classify based on actual signal analysis
                is_scream = estimated_freq > 1100.0 and rms > 0.40
                is_surge = rms > 0.30

                return {
                    "rms": round(rms, 3),
                    "peak_freq": round(estimated_freq, 1),
                    "centroid": round(estimated_freq * 1.35, 1),
                    "is_scream": is_scream,
                    "is_surge": is_surge
                }
        except Exception as e:
            print(f"Error processing demo WAV file {filename}: {e}")
            return {"rms": 0.05, "peak_freq": 350.0, "centroid": 1000.0, "is_scream": False, "is_surge": False}

    def analyze_audio_window(self, user_id: int, session_id: str, duration_sec: int = 6, scenario: str = "CRITICAL") -> Dict[str, Any]:
        filename = self.SCENARIO_FILE_MAP.get(scenario.upper(), "distress_sound.wav")
        features = self._process_wav_file(filename)

        rms = features["rms"]
        peak_freq = features["peak_freq"]
        is_scream = features["is_scream"]
        is_surge = features["is_surge"]

        keywords = []
        if scenario.upper() == "CRITICAL" or is_scream:
            keywords = ["help", "stop"]
            classification = "POTENTIAL_DISTRESS_SCREAM"
        elif is_surge or scenario.upper() in ["CAUTION", "HIGH_RISK"]:
            classification = "SUSPICIOUS_ACOUSTIC_SURGE"
        else:
            classification = "NORMAL_CALM_ENVIRONMENT"

        return {
            "source": "DEMO AUDIO",
            "audio_file": filename,
            "audio_stream_url": f"/api/safety/audio/demo/{scenario.upper()}",
            "rms_volume": rms,
            "peak_frequency_hz": peak_freq,
            "spectral_centroid": features["centroid"],
            "distress_keywords_detected": keywords,
            "high_pitch_scream_detected": is_scream,
            "acoustic_energy_surge": is_surge,
            "acoustic_classification": classification,
            "sensor_reliability": 0.98,
            "is_mock": True,
            "is_simulated_audio": True,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
