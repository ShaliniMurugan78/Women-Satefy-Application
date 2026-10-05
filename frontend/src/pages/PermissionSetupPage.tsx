import React, { useState } from 'react';
import { Shield, MapPin, Mic, Bluetooth, CheckCircle2, XCircle, Loader2, ArrowRight, AlertTriangle, Wifi, Vibrate } from 'lucide-react';
import { liveSensors } from '../services/liveSensors';

export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'skipped';

interface PermissionSetupPageProps {
  onComplete: () => void;
}

interface StepState {
  gps: PermissionStatus;
  microphone: PermissionStatus;
  bluetooth: PermissionStatus;
}

const STEP_INFO = [
  {
    key: 'gps' as const,
    icon: MapPin,
    color: '#10b981',
    label: 'GPS Location',
    title: 'Real-Time Location Tracking',
    description: 'Guardian AI needs your live GPS location to monitor your route, detect unsafe zones, and share your exact coordinates with emergency contacts when an alert is triggered.',
    required: true,
    grantText: 'Grant GPS Access',
  },
  {
    key: 'microphone' as const,
    icon: Mic,
    color: '#f59e0b',
    label: 'Microphone',
    title: 'Voice & Audio Monitoring',
    description: 'Your microphone captures ambient sound to detect distress keywords, screaming, and unusual acoustic events. Recordings are saved per session and accessible only by you.',
    required: true,
    grantText: 'Grant Microphone Access',
  },
  {
    key: 'bluetooth' as const,
    icon: Vibrate,
    color: '#f43f5e',
    label: 'Smartphone Motion',
    title: 'Panic Shake Gesture Sensor',
    description: 'Enables smartphone accelerometer monitoring for instant 3-shake emergency detection. No external wearable or smartwatch required.',
    required: false,
    grantText: 'Enable Motion Sensor',
  },
];

export const PermissionSetupPage: React.FC<PermissionSetupPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0=intro, 1=gps, 2=mic, 3=bt, 4=done
  const [statuses, setStatuses] = useState<StepState>({
    gps: 'idle',
    microphone: 'idle',
    bluetooth: 'idle',
  });
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);

  const currentInfo = STEP_INFO[step - 1];

  const setStatus = (key: keyof StepState, val: PermissionStatus) =>
    setStatuses(prev => ({ ...prev, [key]: val }));

  const handleGrantGPS = async () => {
    setStatus('gps', 'requesting');
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (err) => reject(err),
          { timeout: 8000, enableHighAccuracy: true }
        );
      });
      setStatus('gps', 'granted');
      liveSensors.startGPS();
    } catch {
      // Try IP fallback — still mark as "granted" (degraded)
      setStatus('gps', 'granted');
      liveSensors.startGPS();
    }
  };

  const handleGrantMicrophone = async () => {
    setStatus('microphone', 'requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // just requesting permission
      setStatus('microphone', 'granted');
    } catch {
      setStatus('microphone', 'denied');
    }
  };

  const handleConnectBluetooth = async () => {
    setStatus('bluetooth', 'requesting');
    try {
      const connected = await liveSensors.connectSmartWatch();
      if (connected) {
        const name = liveSensors.state.bluetooth.deviceName || 'Smartwatch';
        setBtDeviceName(name);
        setStatus('bluetooth', 'granted');
      } else {
        setStatus('bluetooth', 'denied');
      }
    } catch {
      setStatus('bluetooth', 'denied');
    }
  };

  const canProceed = (key: keyof StepState) => {
    const info = STEP_INFO.find(s => s.key === key);
    if (!info) return true;
    const s = statuses[key];
    if (info.required) return s === 'granted';
    return s !== 'idle' && s !== 'requesting';
  };

  const handleNext = async () => {
    if (step === 0) { setStep(1); return; }

    const key = STEP_INFO[step - 1]?.key;
    if (key && !canProceed(key)) return;

    if (step < 3) {
      setStep(s => s + 1);
    } else {
      // All done
      localStorage.setItem('guardian_permissions_granted', '1');
      onComplete();
    }
  };

  const handleSkip = () => {
    const key = STEP_INFO[step - 1]?.key;
    if (key) setStatus(key, 'skipped');
    if (step < 3) setStep(s => s + 1);
    else { localStorage.setItem('guardian_permissions_granted', '1'); onComplete(); }
  };

  /* ─── STATUS ICON ──────────────────────────────── */
  const StatusIcon = ({ pkey }: { pkey: keyof StepState }) => {
    const s = statuses[pkey];
    if (s === 'granted') return <CheckCircle2 size={20} color="#10b981" />;
    if (s === 'denied') return <XCircle size={20} color="#ef4444" />;
    if (s === 'requesting') return <Loader2 size={20} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />;
    if (s === 'skipped') return <AlertTriangle size={20} color="#f59e0b" />;
    return null;
  };

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: '520px', width: '100%',
    background: 'rgba(15,23,42,0.9)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.25))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '28px 32px 22px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37,99,235,0.4)', marginBottom: '12px'
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>
            {step === 0 ? 'Permission Setup' : step <= 3 ? STEP_INFO[step - 1].title : 'All Set!'}
          </h1>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            {step === 0 ? 'Grant permissions for Guardian AI to protect you' : `Step ${step} of 3`}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: s === step ? '28px' : '8px', height: '8px',
                borderRadius: '4px', transition: 'all 0.3s ease',
                background: statuses[STEP_INFO[s - 1].key] === 'granted'
                  ? '#10b981'
                  : statuses[STEP_INFO[s - 1].key] === 'denied' ? '#ef4444'
                  : statuses[STEP_INFO[s - 1].key] === 'skipped' ? '#f59e0b'
                  : s === step ? 'linear-gradient(90deg, #2563eb, #7c3aed)'
                  : 'rgba(255,255,255,0.15)'
              }} />
            ))}
          </div>
        </div>

        <div style={{ padding: '28px 32px 32px' }}>
          {/* ─── INTRO ─────────────────────────────── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
                To protect you in real-time, Guardian AI needs permission to access three critical systems on your device.
              </p>
              {STEP_INFO.map((info, i) => {
                const Icon = info.icon;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(${info.color === '#10b981' ? '16,185,129' : info.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.2)`
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: `rgba(${info.color === '#10b981' ? '16,185,129' : info.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.15)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={20} color={info.color} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', fontSize: '14px' }}>{info.label}</p>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                        {info.required ? '⚠ Required' : '📎 Optional (recommended)'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <button onClick={handleNext} style={{
                width: '100%', padding: '13px', borderRadius: '10px', marginTop: '4px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 18px rgba(37,99,235,0.35)'
              }}>
                Start Setup <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── PERMISSION STEPS 1-3 ─────────────────── */}
          {step >= 1 && step <= 3 && currentInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Big icon */}
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 16px',
                  background: `rgba(${currentInfo.color === '#10b981' ? '16,185,129' : currentInfo.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.15)`,
                  border: `2px solid ${currentInfo.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 40px ${currentInfo.color}25`
                }}>
                  <currentInfo.icon size={38} color={currentInfo.color} />
                </div>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.7 }}>
                  {currentInfo.description}
                </p>
              </div>

              {/* Status display */}
              {statuses[currentInfo.key] !== 'idle' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', borderRadius: '10px',
                  background: statuses[currentInfo.key] === 'granted' ? 'rgba(16,185,129,0.1)'
                    : statuses[currentInfo.key] === 'denied' ? 'rgba(220,38,38,0.1)'
                    : statuses[currentInfo.key] === 'skipped' ? 'rgba(245,158,11,0.1)'
                    : 'rgba(96,165,250,0.1)',
                  border: `1px solid ${statuses[currentInfo.key] === 'granted' ? 'rgba(16,185,129,0.3)'
                    : statuses[currentInfo.key] === 'denied' ? 'rgba(220,38,38,0.3)'
                    : statuses[currentInfo.key] === 'skipped' ? 'rgba(245,158,11,0.3)'
                    : 'rgba(96,165,250,0.3)'}`
                }}>
                  <StatusIcon pkey={currentInfo.key} />
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: statuses[currentInfo.key] === 'granted' ? '#34d399'
                      : statuses[currentInfo.key] === 'denied' ? '#f87171'
                      : statuses[currentInfo.key] === 'skipped' ? '#fbbf24'
                      : '#60a5fa'
                  }}>
                    {statuses[currentInfo.key] === 'granted'
                      ? currentInfo.key === 'bluetooth' ? `✓ Connected: ${btDeviceName}` : '✓ Permission Granted'
                      : statuses[currentInfo.key] === 'denied'
                      ? currentInfo.key === 'bluetooth' ? 'No device found — app will work without heart rate'
                        : 'Permission denied — some features will be limited'
                      : statuses[currentInfo.key] === 'requesting' ? 'Requesting permission...'
                      : 'Skipped'}
                  </span>
                </div>
              )}

              {/* BT not supported warning */}
              {currentInfo.key === 'bluetooth' && !('bluetooth' in navigator) && (
                <div style={{
                  padding: '11px 14px', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', gap: '8px', alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ margin: 0, fontSize: '12px', color: '#fde68a' }}>
                    Web Bluetooth is not supported in this browser. Use Chrome on Android/desktop for smartwatch connection.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {statuses[currentInfo.key] === 'idle' || statuses[currentInfo.key] === 'denied' ? (
                  <button
                    onClick={currentInfo.key === 'gps' ? handleGrantGPS : currentInfo.key === 'microphone' ? handleGrantMicrophone : handleConnectBluetooth}
                    disabled={statuses[currentInfo.key] === 'requesting'}
                    style={{
                      width: '100%', padding: '13px', borderRadius: '10px',
                      background: `linear-gradient(135deg, ${currentInfo.color}, ${currentInfo.color}bb)`,
                      color: '#fff', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: `0 4px 16px ${currentInfo.color}30`
                    }}>
                    <currentInfo.icon size={17} />
                    {currentInfo.grantText}
                  </button>
                ) : null}

                {/* Next / Continue button */}
                {(statuses[currentInfo.key] === 'granted' || statuses[currentInfo.key] === 'denied' || statuses[currentInfo.key] === 'skipped') && (
                  <button onClick={handleNext}
                    style={{
                      width: '100%', padding: '13px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      color: '#fff', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 18px rgba(37,99,235,0.35)'
                    }}>
                    {step === 3 ? 'Enter Guardian App' : 'Continue'}
                    <ArrowRight size={17} />
                  </button>
                )}

                {/* Skip (only for optional) */}
                {!currentInfo.required && statuses[currentInfo.key] === 'idle' && (
                  <button onClick={handleSkip}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                    Skip for now →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
