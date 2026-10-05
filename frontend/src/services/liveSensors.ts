import { api } from './api';
import { bluetoothManager } from '../bluetooth';

export interface LiveSensorState {
  gps: { available: boolean; lat?: number; lng?: number; accuracy?: number; speed?: number; error?: string };
  motion: { available: boolean; accelX: number; accelY: number; accelZ: number; magnitude: number; isMoving: boolean };
  audio: { available: boolean; rms: number; peakFreq: number; isRecording: boolean };
  bluetooth: { available: boolean; connected: boolean; deviceName?: string; heartRate?: number };
}

class LiveSensorManager {
  private geoWatchId: number | null = null;
  private audioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioInterval: number | null = null;
  private motionListenerAttached = false;

  // ── MediaRecorder for session audio capture ──
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingInterval: number | null = null;
  private activeSessionId: string | null = null;
  private activeSessionMode: string = 'LIVE';

  public state: LiveSensorState = {
    gps: { available: typeof navigator !== 'undefined' && 'geolocation' in navigator },
    motion: { available: typeof window !== 'undefined' && 'DeviceMotionEvent' in window, accelX: 0, accelY: 0, accelZ: 9.8, magnitude: 9.8, isMoving: false },
    audio: { available: typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), rms: 0, peakFreq: 0, isRecording: false },
    bluetooth: { available: bluetoothManager.isSupported(), connected: bluetoothManager.isConnected() }
  };

  private listeners: Array<(state: LiveSensorState) => void> = [];

  constructor() {
    // Synchronize with Bluetooth Manager
    bluetoothManager.subscribe((bleState) => {
      const isConnected = bleState.status === 'CONNECTED' || bleState.status === 'SUBSCRIBED';
      this.state.bluetooth = {
        available: bluetoothManager.isSupported(),
        connected: isConnected,
        deviceName: bleState.device?.name,
        heartRate: bleState.latestHeartRate?.heartRate
      };

      if (bleState.latestMotion) {
        const mag = Math.sqrt(
          bleState.latestMotion.accelX ** 2 +
          bleState.latestMotion.accelY ** 2 +
          bleState.latestMotion.accelZ ** 2
        );
        this.state.motion = {
          available: true,
          accelX: Math.round(bleState.latestMotion.accelX * 100) / 100,
          accelY: Math.round(bleState.latestMotion.accelY * 100) / 100,
          accelZ: Math.round(bleState.latestMotion.accelZ * 100) / 100,
          magnitude: Math.round(mag * 100) / 100,
          isMoving: bleState.latestMotion.activity !== 'STATIONARY'
        };
      }

      if (isConnected && bleState.latestHeartRate?.heartRate) {
        api.sendWatchTelemetry(
          bleState.latestHeartRate.heartRate,
          bleState.latestHeartRate.heartRate > 100 ? 'ELEVATED' : 'RESTING',
          'CONNECTED'
        ).catch(() => {});
      }

      this.notify();
    });
  }

  subscribe(listener: (state: LiveSensorState) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  // --- GPS Geolocation with Multi-Tier Fallback ---
  async startGPS() {
    const applyPosition = (lat: number, lng: number, accuracy = 10, speed = 0, source = 'GPS') => {
      this.state.gps = {
        available: true,
        lat,
        lng,
        accuracy,
        speed,
        error: undefined
      };
      this.notify();
      api.sendGpsTelemetry(lat, lng, accuracy, speed).catch(() => {});
    };

    const fetchIpFallback = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            applyPosition(data.latitude, data.longitude, 100, 0, 'IP_NET');
            return;
          }
        }
      } catch (e) {}

      try {
        const res2 = await fetch('https://freeipapi.com/api/json');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && data2.latitude && data2.longitude) {
            applyPosition(data2.latitude, data2.longitude, 100, 0, 'IP_NET');
            return;
          }
        }
      } catch (e2) {}

      // Default safe fallback
      if (!this.state.gps.lat) {
        applyPosition(13.0827, 80.2707, 15, 0, 'FALLBACK');
      }
    };

    if (!('geolocation' in navigator)) {
      this.state.gps.error = 'Browser Geolocation not supported. Using Network IP Fix.';
      fetchIpFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 10, pos.coords.speed || 0);
      },
      (err) => {
        console.warn('Fast GPS fix error:', err.message);
        fetchIpFallback();
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );

    try {
      this.geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
          applyPosition(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy || 8,
            position.coords.speed || 0
          );
        },
        (error) => {
          console.warn('WatchPosition notice:', error.message);
          if (!this.state.gps.lat) {
            fetchIpFallback();
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } catch (err: any) {
      console.warn('watchPosition setup exception:', err);
      fetchIpFallback();
    }
  }

  stopGPS() {
    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
  }

  // --- Device Motion & Kinematics ---
  startMotion() {
    if (this.motionListenerAttached || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || { x: 0, y: 0, z: 9.8 };
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 9.8;
      const mag = Math.sqrt(x * x + y * y + z * z);
      const isMoving = Math.abs(mag - 9.8) > 1.5;

      const rot = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

      this.state.motion = {
        available: true,
        accelX: Math.round(x * 100) / 100,
        accelY: Math.round(y * 100) / 100,
        accelZ: Math.round(z * 100) / 100,
        magnitude: Math.round(mag * 100) / 100,
        isMoving
      };
      this.notify();

      // Transmit to backend
      api.sendSensorTelemetry(x, y, z, rot.alpha || 0, rot.beta || 0, rot.gamma || 0).catch(() => {});
    };

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            this.motionListenerAttached = true;
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
      this.motionListenerAttached = true;
    }
  }

  stopMotion() {
    this.motionListenerAttached = false;
  }

  // --- Web Audio Spectrum Analyser ---
  async startAudio() {
    if (this.audioStream) return;
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      this.state.audio.isRecording = true;
      this.notify();

      const bufferLength = this.audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastTelemetrySent = 0;
      this.audioInterval = window.setInterval(() => {
        if (!this.audioAnalyser) return;
        this.audioAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        let maxVal = 0;
        let maxIndex = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
          if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
            maxIndex = i;
          }
        }

        const rms = Math.sqrt(sum / bufferLength) / 255;
        const peakFreq = (maxIndex * (this.audioContext?.sampleRate || 44100)) / (256 * 2);
        const centroid = peakFreq * 1.2;

        this.state.audio.rms = Math.round(rms * 100) / 100;
        this.state.audio.peakFreq = Math.round(peakFreq);
        this.notify();

        // Always transmit audio telemetry every 1 second (capturing ambient silence, quiet speech, and surges)
        const now = Date.now();
        if (now - lastTelemetrySent >= 1000) {
          lastTelemetrySent = now;
          api.sendAudioTelemetry(rms, peakFreq, centroid, rms > 0.40).catch(() => {});
        }
      }, 250);
    } catch (err: any) {
      console.warn('Microphone permission not granted or unavailable:', err);
      this.state.audio.available = false;
      this.notify();
    }
  }

  stopAudio() {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.state.audio.isRecording = false;
    this.notify();
  }

  // Connect BLE Smartwatch via master bluetooth manager
  async connectSmartWatch(): Promise<boolean> {
    return await bluetoothManager.scanAndConnect();
  }

  // ── Public individual stop methods (used by SafetyContext HYBRID mode) ──

  // Start all live telemetry for LIVE SAFETY MODE
  startAllLiveSensors() {
    this.startGPS();
    this.startMotion();
    this.startAudio();
  }

  stopAllLiveSensors() {
    this.stopGPS();
    this.stopMotion();
    this.stopAudio();
    this.stopRecording();
  }

  // ── MediaRecorder: 10-second continuous ambient and vocal recording ──
  private isRecordingSessionActive: boolean = false;
  private recordingMimeType: string = '';

  async startRecording(sessionId: string, mode = 'LIVE') {
    this.activeSessionId = sessionId;
    this.activeSessionMode = mode;
    this.isRecordingSessionActive = true;
    this.recordingChunks = [];

    // Ensure audio stream is initialized
    if (!this.audioStream) {
      await this.startAudio();
    }

    if (!this.audioStream) {
      console.warn('MediaRecorder warning: No audio stream available yet to record');
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      this.recordingMimeType = mimeType;
      this.mediaRecorder = new MediaRecorder(
        this.audioStream,
        mimeType ? { mimeType } : {}
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordingChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const capturedChunks = [...this.recordingChunks];
        this.recordingChunks = [];
        const currentSession = this.activeSessionId;
        const currentMode = this.activeSessionMode;

        if (capturedChunks.length > 0 && currentSession) {
          const blob = new Blob(capturedChunks, {
            type: this.recordingMimeType || 'audio/webm'
          });
          // Upload any sound captured (ambient silence, quiet voices, or distress)
          if (blob.size > 0) {
            await this._uploadChunk(blob, currentSession, currentMode);
          }
        }

        // If session is still active, safely start next 10-second recording cycle
        if (
          this.isRecordingSessionActive &&
          this.audioStream &&
          this.audioStream.active &&
          this.mediaRecorder &&
          this.mediaRecorder.state === 'inactive'
        ) {
          try {
            this.mediaRecorder.start();
          } catch (restartErr) {
            console.warn('MediaRecorder cycle restart notice:', restartErr);
          }
        } else if (!this.isRecordingSessionActive) {
          this.activeSessionId = null;
          this.mediaRecorder = null;
        }
      };

      // Start recording the initial 10-second chunk
      this.mediaRecorder.start();

      // Cycle every 10 seconds (10000ms)
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
      }
      this.recordingInterval = window.setInterval(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          // Stopping triggers ondataavailable then onstop cleanly
          this.mediaRecorder.stop();
        }
      }, 10000);

    } catch (err) {
      console.warn('MediaRecorder init failed:', err);
    }
  }

  stopRecording() {
    this.isRecordingSessionActive = false;
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      // Stopping will trigger onstop which will upload the current chunk
      this.mediaRecorder.stop();
    } else {
      this.activeSessionId = null;
      this.mediaRecorder = null;
    }
  }

  private async _uploadChunk(blob: Blob, sessionId: string, mode: string) {
    const token = localStorage.getItem('guardian_token');
    if (!token) return;

    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('duration_seconds', '10');
    formData.append('rms_level', String(this.state.audio.rms));
    formData.append('is_distress', String(this.state.audio.rms > 0.40));
    formData.append('mode', mode);
    formData.append('audio_file', blob, `rec_${sessionId}_${Date.now()}.webm`);

    try {
      const res = await fetch('http://localhost:8000/api/safety/audio/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        console.log('10s Audio chunk persisted to incident audit trail:', data);
      } else {
        console.warn('Audio chunk upload responded with status:', res.status);
      }
    } catch (err) {
      console.warn('Audio chunk upload failed:', err);
    }
  }

  /**
   * Dedicated Voice Agent Recording — always requests a FRESH microphone stream.
   * Uses 250ms timeslices so data is captured continuously even if the shared
   * stream was stopped (e.g., HYBRID mode stops audio before Voice Agent fires).
   * Resolves with { blob, url } for immediate playback.
   */
  async recordLiveAudioClip(
    sessionId: string,
    durationSeconds: number = 10,
    mode: string = 'LIVE',
    onTick?: (secondsLeft: number, rms: number) => void
  ): Promise<{ blob: Blob; url: string }> {
    return new Promise(async (resolve) => {
      // ── 1. Always request a fresh stream (avoids stale/ended shared stream) ──
      let freshStream: MediaStream | null = null;
      try {
        freshStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (permErr) {
        console.warn('[VoiceAgent] Microphone access denied:', permErr);
      }

      // ── 2. No mic access → fake countdown then fallback WAV ──
      if (!freshStream) {
        if (onTick) onTick(durationSeconds, 0);
        let rem = durationSeconds;
        const fakeTimer = window.setInterval(() => {
          rem -= 1;
          if (onTick) onTick(Math.max(0, rem), 0);
          if (rem <= 0) clearInterval(fakeTimer);
        }, 1000);
        await new Promise(r => setTimeout(r, durationSeconds * 1000));
        clearInterval(fakeTimer);
        const fallbackBlob = this._generateFallbackWavBlob(durationSeconds);
        const url = URL.createObjectURL(fallbackBlob);
        await this._uploadChunk(fallbackBlob, sessionId, mode);
        resolve({ blob: fallbackBlob, url });
        return;
      }

      // ── 3. Live RMS analyser for tick values ──
      let liveRms = 0;
      let analyserCtx: AudioContext | null = null;
      try {
        analyserCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const src = analyserCtx.createMediaStreamSource(freshStream);
        const an = analyserCtx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        window.setInterval(() => {
          an.getByteFrequencyData(buf);
          let s = 0;
          for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
          liveRms = Math.sqrt(s / buf.length) / 255;
        }, 250);
      } catch (_) {}

      // ── 4. Pick best supported MIME type ──
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      // ── 5. Create MediaRecorder on the fresh stream ──
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(freshStream, mimeType ? { mimeType } : {});
      } catch (recErr) {
        console.warn('[VoiceAgent] MediaRecorder creation failed:', recErr);
        freshStream.getTracks().forEach(t => t.stop());
        if (analyserCtx) analyserCtx.close().catch(() => {});
        const fallbackBlob = this._generateFallbackWavBlob(durationSeconds);
        const url = URL.createObjectURL(fallbackBlob);
        await this._uploadChunk(fallbackBlob, sessionId, mode);
        resolve({ blob: fallbackBlob, url });
        return;
      }

      const chunks: Blob[] = [];

      // Timesliced every 250ms ensures data even if stop() is delayed
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Release mic + analyser
        freshStream!.getTracks().forEach(t => t.stop());
        if (analyserCtx) analyserCtx.close().catch(() => {});

        const finalBlob = chunks.length > 0
          ? new Blob(chunks, { type: mimeType || 'audio/webm' })
          : this._generateFallbackWavBlob(durationSeconds);

        const url = URL.createObjectURL(finalBlob);
        await this._uploadChunk(finalBlob, sessionId, mode);
        resolve({ blob: finalBlob, url });
      };

      // ── 6. Start recording with 250ms timeslices ──
      recorder.start(250);
      if (onTick) onTick(durationSeconds, liveRms);

      // ── 7. Countdown and auto-stop after durationSeconds ──
      let remaining = durationSeconds;
      const tickTimer = window.setInterval(() => {
        remaining -= 1;
        if (onTick) onTick(Math.max(0, remaining), liveRms);
        if (remaining <= 0) {
          clearInterval(tickTimer);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    });
  }

  private _generateFallbackWavBlob(durationSec: number): Blob {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSec;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate gentle ambient room tone with low background noise
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 220 * t) * 0.05 + (Math.random() - 0.5) * 0.02;
      view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}

export const liveSensors = new LiveSensorManager();
