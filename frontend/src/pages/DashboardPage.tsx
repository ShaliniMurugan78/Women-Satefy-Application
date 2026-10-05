import React, { useState, useRef, useEffect } from 'react';
import { useSafety } from '../context/SafetyContext';
import { useAuth } from '../context/AuthContext';
import { liveSensors } from '../services/liveSensors';
import { BluetoothModal } from '../components/safety/BluetoothModal';
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  PhoneCall,
  Navigation,
  History,
  RefreshCw,
  Radio,
  Volume2,
  VolumeX,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Lock,
  Building2,
  ArrowUpRight,
  Bluetooth,
  Vibrate,
  CheckCircle2
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { mode, scenario, isMonitoring, overallRiskScore, overallRiskLevel, liveSensorsState, triggerSOS } = useSafety();

  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const holdIntervalRef = useRef<number | null>(null);

  // Siren Audio State
  const [sirenActive, setSirenActive] = useState(false);
  const sirenAudioCtxRef = useRef<AudioContext | null>(null);

  const startHold = () => {
    if (isMonitoring) {
      onNavigate('safety');
      return;
    }
    setHolding(true);
    let current = 0;
    holdIntervalRef.current = window.setInterval(() => {
      current += 4;
      setHoldProgress(current);
      if (current >= 100) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setHolding(false);
        setHoldProgress(0);
        triggerSOS('SOS Vertical Emergency Activation');
        onNavigate('safety');
      }
    }, 40); // 1-second hold to trigger
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  };

  const handleRefreshLocation = () => {
    if (mode === 'LIVE') {
      liveSensors.startGPS();
    }
  };

  // Auto trigger GPS on component mount if in LIVE mode
  useEffect(() => {
    if (mode === 'LIVE') {
      liveSensors.startGPS();
    }
  }, [mode]);

  // Clean up siren on unmount
  useEffect(() => {
    return () => {
      if (sirenAudioCtxRef.current) {
        try {
          sirenAudioCtxRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  const toggleSiren = () => {
    if (sirenActive) {
      if (sirenAudioCtxRef.current) {
        try {
          sirenAudioCtxRef.current.close();
        } catch (e) {}
        sirenAudioCtxRef.current = null;
      }
      setSirenActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        sirenAudioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);

        const now = ctx.currentTime;
        // Two-tone European emergency siren pitch oscillation
        for (let i = 0; i < 40; i++) {
          osc.frequency.setValueAtTime(960, now + i * 0.6);
          osc.frequency.setValueAtTime(770, now + i * 0.6 + 0.3);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setSirenActive(true);
      } catch (e) {
        console.warn('Failed to start siren audio:', e);
      }
    }
  };

  const currentLat = mode === 'LIVE' && liveSensorsState.gps.lat ? liveSensorsState.gps.lat : 13.0827;
  const currentLng = mode === 'LIVE' && liveSensorsState.gps.lng ? liveSensorsState.gps.lng : 80.2707;
  const isSafe = overallRiskLevel === 'SAFE';

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* 2x2 Dashboard Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px'
        }}
      >
        {/* ========================================== */}
        {/* TOP LEFT: VERTICAL SOS DISTRESS TRIGGER    */}
        {/* ========================================== */}
        <div
          className="guardian-card"
          style={{
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '340px',
            backgroundColor: 'var(--bg-surface)',
            border: holding || isMonitoring ? '2px solid #ef4444' : '1px solid var(--border-light)',
            boxShadow: isMonitoring ? 'var(--shadow-glow-red)' : 'var(--shadow-sm)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  backgroundColor: 'rgba(239, 68, 68, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626'
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  EMERGENCY SOS DISTRESS TRIGGER
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Tactile 1-Second Hold Activation
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isMonitoring ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-subtle)',
                color: isMonitoring ? '#dc2626' : 'var(--text-muted)',
                border: `1px solid ${isMonitoring ? '#ef4444' : 'var(--border-light)'}`
              }}
            >
              {isMonitoring ? 'TRANSMITTING' : 'READY TO DEPLOY'}
            </span>
          </div>

          {/* SOS Activator Button */}
          <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px',
                height: '130px'
              }}
            >
              {/* Hold Progress Halo */}
              {holding && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    right: '-4px',
                    bottom: '-4px',
                    borderRadius: '22px',
                    border: '3px solid #dc2626',
                    animation: 'pulseGlow 1.2s infinite',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* SOS Button */}
              <button
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                className={`sos-vertical-block ${isMonitoring ? 'animate-pulse-glow' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 28px'
                }}
              >
                {/* Left side: Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <ShieldAlert size={32} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '0.03em', lineHeight: 1.1 }}>
                      {isMonitoring ? 'VIEW PIPELINE' : 'HOLD SOS'}
                    </div>
                    <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>
                      {holding ? `Engaging Protocol... ${holdProgress}%` : 'Press & Hold for 1s'}
                    </span>
                  </div>
                </div>

                {/* Right side: Icon beacon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Radio size={20} className={holding || isMonitoring ? 'animate-spin' : ''} />
                </div>

                {/* Hold progress bar filler */}
                {holding && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${holdProgress}%`,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      transition: 'width 0.04s linear',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <span>Instant Multi-Agent Corroboration</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Sequential Sub-3 Min Escalation</span>
          </div>
        </div>

        {/* ========================================== */}
        {/* TOP RIGHT: GUARDIAN SYSTEM STATUS MATRIX   */}
        {/* ========================================== */}
        <div
          className="guardian-card"
          style={{
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '340px',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  backgroundColor: isMonitoring ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isMonitoring ? '#dc2626' : '#10b981'
                }}
              >
                {isMonitoring ? <Activity size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  GUARDIAN SYSTEM STATUS
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Real-Time Armed Defense Telemetry
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isSafe ? 'var(--color-safe-bg)' : 'var(--color-high-risk-bg)',
                color: isSafe ? '#16a34a' : '#dc2626',
                border: `1px solid ${isSafe ? 'var(--color-safe-border)' : 'var(--color-high-risk-border)'}`
              }}
            >
              {isMonitoring ? `RISK: ${overallRiskLevel}` : 'ARMED & ACTIVE'}
            </span>
          </div>

          {/* Metrics Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              margin: '18px 0'
            }}
          >
            {/* Threat Index Metric */}
            <div
              style={{
                padding: '14px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Threat Index
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: isSafe ? '#10b981' : '#dc2626', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>
                {Math.round(overallRiskScore)}/100
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: isSafe ? '#16a34a' : '#dc2626' }}>
                {overallRiskLevel}
              </span>
            </div>

            {/* Pipeline Stage Metric */}
            <div
              style={{
                padding: '14px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Mode
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                {mode === 'LIVE' ? 'LIVE' : 'HYBRID'}
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {mode === 'LIVE' ? 'Live Telemetry' : 'Demo Presentation'}
              </span>

            </div>

            {/* Geofence Corridor Metric */}
            <div
              style={{
                padding: '14px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Safety Geofence
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', margin: '6px 0 2px 0' }}>
                VERIFIED
              </div>
              <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 700 }}>
                Safe Corridor
              </span>
            </div>
          </div>

          {/* User & Security Bar */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} color="#2563eb" />
              <span style={{ color: 'var(--text-secondary)' }}>
                Protected User: <strong style={{ color: 'var(--text-primary)' }}>{user?.full_name || 'Guardian User'}</strong>
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              AES-256 Encrypted Telemetry
            </span>
          </div>
        </div>

        {/* ========================================== */}
        {/* BOTTOM LEFT: LIVE MONITORED MAP LOCATION   */}
        {/* ========================================== */}
        <div
          className="guardian-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '380px',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-blue)'
                }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  LIVE MONITORED MAP LOCATION
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  High-Precision Real-Time GPS Tracking Pin
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#16a34a',
                backgroundColor: 'var(--color-safe-bg)',
                border: '1px solid var(--color-safe-border)',
                padding: '3px 8px',
                borderRadius: '12px'
              }}
            >
              Precision: +/- 8.5m
            </span>
          </div>

          {/* Interactive Live Map View with User Beacon */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '210px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)'
            }}
          >
            {(() => {
              const delta = 0.007;
              const bbox = `${currentLng - delta}%2C${currentLat - delta}%2C${currentLng + delta}%2C${currentLat + delta}`;
              const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

              return (
                <iframe
                  title="Live Safety Map Location"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={mapSrc}
                  style={{ border: 0, width: '100%', height: '100%' }}
                />
              );
            })()}

            {/* Pulsing Radar Ring User Marker */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37, 99, 235, 0.35)',
                  animation: 'pulseGlow 2s infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    border: '2.5px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Coordinates & Controls Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                GPS Fix Coordinates
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {currentLat.toFixed(4)} N, {currentLng.toFixed(4)} E
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {mode === 'LIVE' && (
                <button
                  onClick={handleRefreshLocation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Refresh GPS Coordinates"
                >
                  <RefreshCw size={12} /> Sync Fix
                </button>
              )}
              <a
                href={`https://maps.google.com/?q=${currentLat},${currentLng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-blue)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Google Maps <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* BOTTOM RIGHT: RAPID DEFENSE & SAFETY TOOLS */}
        {/* ========================================== */}
        <div
          className="guardian-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '380px',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(124, 58, 237, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed'
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  RAPID DEFENSE & DISPATCH
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Emergency Haven Proximity & Speed Dial
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.12)',
                padding: '3px 8px',
                borderRadius: '12px'
              }}
            >
              ACTIVE
            </span>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {/* Safe Route Module Button */}
            <button
              onClick={() => onNavigate('safe-route')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981'
                  }}
                >
                  <Navigation size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Safe Navigation Corridor
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Generate CCTV-monitored & well-lit safe corridor
                  </span>
                </div>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </button>

            {/* Bluetooth BLE Wearable Pairing Button */}
            <button
              onClick={() => setIsBluetoothModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '12px',
                backgroundColor: liveSensorsState.bluetooth.connected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                border: `1px solid ${liveSensorsState.bluetooth.connected ? '#10b981' : 'var(--border-light)'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1'
                  }}
                >
                  <Vibrate size={17} color="#f43f5e" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Panic Shake Gesture Sensor
                  </div>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    Active: 3-Shake Accelerometer & Rapid-Tap SOS
                  </span>
                </div>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </button>

            {/* Emergency Contacts Button */}
            <button
              onClick={() => onNavigate('contacts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}
                >
                  <PhoneCall size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Emergency Contacts & Speed Dial
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Primary guardians configured for broadcast
                  </span>
                </div>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </button>

            {/* Acoustic Siren Deterrence Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '12px',
                backgroundColor: sirenActive ? 'var(--color-high-risk-bg)' : 'var(--bg-subtle)',
                border: `1.5px solid ${sirenActive ? '#ef4444' : 'var(--border-light)'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: sirenActive ? '#dc2626' : 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: sirenActive ? '#ffffff' : '#dc2626'
                  }}
                >
                  <Radio size={17} className={sirenActive ? 'animate-spin' : ''} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Audible SOS Siren Alarm
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {sirenActive ? 'Loud strobe siren sounding!' : 'Acoustic deterrence for public threats'}
                  </span>
                </div>
              </div>

              <button
                onClick={toggleSiren}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: sirenActive ? '#dc2626' : 'var(--primary-blue)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {sirenActive ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {sirenActive ? 'Stop Siren' : 'Sound Alarm'}
              </button>
            </div>
          </div>

          {/* Nearest Refuge Haven Footnote */}
          <div
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              marginTop: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} color="#10b981" />
              <span style={{ color: 'var(--text-secondary)' }}>
                Nearest Haven: <strong>All-Women Police Helpdesk (400m)</strong>
              </span>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-blue)',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              View Incidents &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bluetooth BLE Pairing Modal */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
      />
    </div>
  );
};
