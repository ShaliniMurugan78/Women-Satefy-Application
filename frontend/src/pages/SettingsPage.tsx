import React, { useState, useEffect } from 'react';
import { useSafety } from '../context/SafetyContext';
import { api } from '../services/api';
import { SystemSettings, ScenarioType, SafetyMode } from '../types';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  Bluetooth,
  Mic,
  Activity,
  Bell,
  Volume2,
  Watch,
  Crosshair,
  Radio,
  Lock,
  RotateCcw,
  Smartphone,
  Vibrate
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { mode, setMode, scenario, setScenario, isMonitoring, connectWatch, liveSensorsState } = useSafety();

  // Settings State
  const [criticalThreshold, setCriticalThreshold] = useState<number>(80);
  const [workflowTimeout, setWorkflowTimeout] = useState<number>(180);
  const [emergencyNumber, setEmergencyNumber] = useState<string>('112');
  const [weights, setWeights] = useState({
    gps: 0.20,
    behaviour: 0.25,
    voice: 0.30,
    panic_gesture: 0.30,
    context: 0.10
  });

  // Device & Sensor Permission States
  const [gpsAllowed, setGpsAllowed] = useState(true);
  const [gpsAccuracyMode, setGpsAccuracyMode] = useState<'high' | 'balanced'>('high');
  const [currentGpsStatus, setCurrentGpsStatus] = useState<string>('GPS Ready (High Accuracy)');
  const [geofenceRadius, setGeofenceRadius] = useState<number>(150);

  // Wearable Bluetooth State
  const [bleLoading, setBleLoading] = useState(false);
  const [autoReconnectWatch, setAutoReconnectWatch] = useState(true);
  const [watchBattery, setWatchBattery] = useState<number>(88);

  // Sensor Toggles
  const [voiceScreamDetection, setVoiceScreamDetection] = useState(true);
  const [fallImpactDetection, setFallImpactDetection] = useState(true);
  const [silentAlarmMode, setSilentAlarmMode] = useState(false);
  const [sosCountdownSeconds, setSosCountdownSeconds] = useState<number>(5);
  const [sirenVolume, setSirenVolume] = useState<number>(90);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSirenActive, setTestSirenActive] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await api.getSettings();
        setCriticalThreshold(s.critical_threshold);
        setWorkflowTimeout(s.workflow_timeout);
        setEmergencyNumber(s.emergency_service_number);
        setWeights(s.fusion_weights);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    };
    loadSettings();

    // Check GPS permission
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGpsStatus(`Lat: ${pos.coords.latitude.toFixed(4)}°, Lng: ${pos.coords.longitude.toFixed(4)}° (Active)`);
          setGpsAllowed(true);
        },
        () => {
          setCurrentGpsStatus('Location access ready (Default mode)');
        }
      );
    }
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        critical_threshold: criticalThreshold,
        workflow_timeout: workflowTimeout,
        emergency_service_number: emergencyNumber,
        fusion_weights: weights
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    }
  };

  // Pair Smartwatch via Web Bluetooth
  const handlePairWatch = async () => {
    setBleLoading(true);
    try {
      const success = await connectWatch();
      setBleLoading(false);
      if (success) {
        alert('SmartWatch linked successfully via Web Bluetooth GATT!');
      }
    } catch (e) {
      setBleLoading(false);
      alert('Bluetooth pairing prompt cancelled or unavailable.');
    }
  };

  // Test GPS Refresh
  const handleRefreshGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGpsStatus(`Live GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (±${pos.coords.accuracy.toFixed(0)}m)`);
          alert('GPS coordinates successfully refreshed!');
        },
        (err) => {
          alert('GPS permission check: ' + err.message);
        }
      );
    }
  };

  // Play a quick test alert chime
  const handleTestSiren = () => {
    setTestSirenActive(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(sirenVolume / 100 * 0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      // Audio fallback
    }
    setTimeout(() => setTestSirenActive(false), 600);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1050px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={26} color="var(--primary-blue)" />
          Hardware Sensors & System Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Configure live GPS tracking permissions, SmartWatch Bluetooth connectivity, emergency escalation parameters, and AI risk models.
        </p>
      </div>

      {saveSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-safe-bg)',
            border: '1px solid var(--color-safe-border)',
            color: '#16a34a',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          Hardware permissions & system settings successfully updated!
        </div>
      )}

      <form onSubmit={handleSaveSettings}>

        {/* Section 1: Hardware & Sensor Permissions */}
        <div className="guardian-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="var(--primary-blue)" />
            Device Hardware & Sensor Permissions
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* GPS Location Permission Card */}
            <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={18} color="var(--primary-blue)" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>GPS Location Tracking</strong>
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>● Permission Active</div>
                    </div>
                  </div>

                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                    <input
                      type="checkbox"
                      checked={gpsAllowed}
                      onChange={(e) => setGpsAllowed(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: gpsAllowed ? 'var(--primary-blue)' : '#ccc', borderRadius: '22px', transition: '.3s' }} />
                  </label>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  {currentGpsStatus}
                </p>

                <div style={{ display: 'flex', gap: '10px', fontSize: '12px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gpsMode"
                      checked={gpsAccuracyMode === 'high'}
                      onChange={() => setGpsAccuracyMode('high')}
                    />
                    High Accuracy (GPS + Wi-Fi)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gpsMode"
                      checked={gpsAccuracyMode === 'balanced'}
                      onChange={() => setGpsAccuracyMode('balanced')}
                    />
                    Battery Saver
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefreshGps}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Crosshair size={14} color="var(--primary-blue)" />
                Test & Refresh Coordinates
              </button>
            </div>

            {/* Smartphone Accelerometer & Panic Gesture Card */}
            <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone size={18} color="#f43f5e" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Smartphone Accelerometer</strong>
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>● DeviceMotion Active</div>
                    </div>
                  </div>

                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--color-safe-bg)', color: '#16a34a' }}>
                    BUILT-IN
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Uses built-in smartphone motion sensor for continuous 3-shake and Rapid-Tap SOS emergency detection. No smartwatch or external wearable required.
                </p>
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                ✓ Shake × 3 and Rapid-Tap SOS active for zero-hardware distress activation.
              </div>
            </div>
          </div>

          {/* Secondary Sensor Toggles */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={16} color="var(--primary-blue)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Acoustic Scream Detection</span>
              </div>
              <input
                type="checkbox"
                checked={voiceScreamDetection}
                onChange={(e) => setVoiceScreamDetection(e.target.checked)}
                style={{ accentColor: 'var(--primary-blue)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#e11d48" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Fall & High-G Impact Sensor</span>
              </div>
              <input
                type="checkbox"
                checked={fallImpactDetection}
                onChange={(e) => setFallImpactDetection(e.target.checked)}
                style={{ accentColor: 'var(--primary-blue)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="#10b981" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Silent SOS Alarm Mode</span>
              </div>
              <input
                type="checkbox"
                checked={silentAlarmMode}
                onChange={(e) => setSilentAlarmMode(e.target.checked)}
                style={{ accentColor: 'var(--primary-blue)' }}
              />
            </label>

          </div>
        </div>

        {/* Section 2: Global Operating Mode Switcher */}
        <div className="guardian-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Shield size={22} color="var(--primary-blue)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Global Operating Mode
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* LIVE SAFETY MODE CARD */}
            <div
              onClick={() => !isMonitoring && setMode('LIVE')}
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: `2px solid ${mode === 'LIVE' ? '#10b981' : 'var(--border-light)'}`,
                backgroundColor: mode === 'LIVE' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                cursor: isMonitoring ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#10b981' }}>LIVE HARDWARE SAFETY MODE</strong>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: mode === 'LIVE' ? '#10b981' : 'var(--border-medium)'
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Consumes genuine device sensors (Real Geolocation, Device Motion, Live Audio Recording chunks, BLE SmartWatch).
              </p>
            </div>

            {/* HYBRID DEMO MODE CARD */}
            <div
              onClick={() => !isMonitoring && setMode('HYBRID')}
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: `2px solid ${mode === 'HYBRID' ? '#8b5cf6' : 'var(--border-light)'}`,
                backgroundColor: mode === 'HYBRID' ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-subtle)',
                cursor: isMonitoring ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#8b5cf6' }}>HYBRID DEMO PRESENTATION MODE</strong>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: mode === 'HYBRID' ? '#8b5cf6' : 'var(--border-medium)'
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Pairs real BLE smartwatch heart rate telemetry with calibrated presentation risk scenarios.
              </p>
            </div>
          </div>

          {/* Scenario Selector when in Hybrid Demo */}
          {mode === 'HYBRID' && (
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Active Demonstration Scenario:
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ScenarioType)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', fontSize: '13px', fontWeight: 600, backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="NORMAL">1. NORMAL — Safe commercial corridor, normal gait, quiet audio, nominal HR</option>
                <option value="CAUTION">2. CAUTION — Dimly-lit alley, anxious pacing, elevated ambient noise</option>
                <option value="HIGH_RISK">3. HIGH RISK — Industrial zone, rapid evasion/sprinting, defensive vocalization, tachycardia</option>
                <option value="CRITICAL">4. CRITICAL — Isolated dead-zone, struggle/impact, scream & distress keywords, acute autonomic surge</option>
              </select>
            </div>
          )}
        </div>


        {/* Section 3: Safety Thresholds & Siren Controls */}
        <div className="guardian-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Sliders size={22} color="#7c3aed" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Thresholds & Escalation Timeouts
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Critical Escalation Threshold
                </label>
                <strong style={{ fontSize: '13px', color: '#dc2626' }}>{criticalThreshold} / 100</strong>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="1"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Scores above this threshold trigger automatic emergency response.
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  SOS Cancellation Window
                </label>
                <strong style={{ fontSize: '13px', color: 'var(--primary-blue)' }}>{sosCountdownSeconds} seconds</strong>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={sosCountdownSeconds}
                onChange={(e) => setSosCountdownSeconds(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Grace window to cancel false emergency triggers.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Emergency Police Helpline Number
              </label>
              <input
                type="text"
                value={emergencyNumber}
                onChange={(e) => setEmergencyNumber(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                National Police Helpline (112 or 1091).
              </span>
            </div>
          </div>

          {/* Siren Test Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Volume2 size={18} color="var(--primary-blue)" />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Emergency Siren Volume ({sirenVolume}%)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>High-decibel acoustic deterrent playback</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSiren}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: testSirenActive ? '#dc2626' : 'var(--bg-subtle)',
                color: testSirenActive ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Volume2 size={14} />
              {testSirenActive ? 'Playing Siren...' : '🔊 Test Alarm'}
            </button>
          </div>
        </div>

        {/* Section 4: Multimodal Risk Fusion Weights */}
        <div className="guardian-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Layers size={22} color="#0891b2" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Multimodal AI Risk Fusion Weights
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Linear combination weights for decision synthesis (GPS + Behaviour + Voice + Heart Rate + Context = 1.0)
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                GPS Agent ({Math.round(weights.gps * 100)}%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.gps}
                onChange={(e) => setWeights({ ...weights, gps: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Behaviour Agent ({Math.round(weights.behaviour * 100)}%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.behaviour}
                onChange={(e) => setWeights({ ...weights, behaviour: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Voice Agent ({Math.round(weights.voice * 100)}%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.voice}
                onChange={(e) => setWeights({ ...weights, voice: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Panic Gesture Agent ({Math.round(weights.panic_gesture * 100)}%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.panic_gesture}
                onChange={(e) => setWeights({ ...weights, panic_gesture: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Context Agent ({Math.round(weights.context * 100)}%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.context}
                onChange={(e) => setWeights({ ...weights, context: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-blue)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Save size={18} />
            Save System Configuration
          </button>
        </div>

      </form>
    </div>
  );
};

export default SettingsPage;
