import React, { useState, useRef } from 'react';
import { AgentVisualState, DataSourceTag } from '../../context/SafetyContext';
import { api } from '../../services/api';
import { panicGestureService } from '../../services/panicGestureService';
import { 
  MapPin, Activity, Mic, Smartphone, ShieldAlert, PhoneCall, CheckCircle2, 
  AlertTriangle, Cpu, Radio, Bluetooth, BluetoothOff, WifiOff, ExternalLink, Vibrate
} from 'lucide-react';

interface AgentCardProps {
  agent: AgentVisualState;
  bleConnected?: boolean;
  bleHeartRate?: number;
  bleMotion?: { magnitude?: number; isMoving?: boolean; activity?: string };
  liveMotion?: { accelX?: number; accelY?: number; accelZ?: number; magnitude?: number; isMoving?: boolean };
  mode?: string;
  voiceCountdown?: number;
  voiceRecordingUrl?: string | null;
  panicShakeCount?: number;
  panicTriggered?: boolean;
  panicTriggerLabel?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, 
  bleConnected = false, 
  bleHeartRate, 
  bleMotion, 
  liveMotion,
  mode = 'LIVE', 
  voiceCountdown = 0, 
  voiceRecordingUrl = null,
  panicShakeCount = 0,
  panicTriggered = false,
  panicTriggerLabel = ''
}) => {
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [timeoutSec, setTimeoutSec] = useState<number>(3.5);
  const [rapidTapCount, setRapidTapCount] = useState<number>(0);
  const [rapidTapTriggered, setRapidTapTriggered] = useState<boolean>(false);
  const rapidTapTimestamps = useRef<number[]>([]);

  const handleRapidTap = () => {
    if (panicTriggered || rapidTapTriggered) return;
    const now = Date.now();
    rapidTapTimestamps.current = rapidTapTimestamps.current.filter(t => now - t < 2000);
    rapidTapTimestamps.current.push(now);
    const count = rapidTapTimestamps.current.length;
    setRapidTapCount(count);

    if (count >= 3) {
      setRapidTapTriggered(true);
      api.sendPanicGestureTelemetry({
        trigger_type: 'RAPID_TAP_SOS',
        shake_count: 3,
        panic_triggered: true,
        peak_magnitude: 28.5,
        timestamp: new Date().toISOString()
      }).catch(console.warn);
    } else {
      setTimeout(() => {
        const cur = Date.now();
        rapidTapTimestamps.current = rapidTapTimestamps.current.filter(t => cur - t < 2000);
        setRapidTapCount(rapidTapTimestamps.current.length);
      }, 2100);
    }
  };

  const isWaiting   = agent.status === 'WAITING';
  const isActive    = agent.status === 'ACTIVE';
  const isCompleted = agent.status === 'COMPLETED';
  const isTriggered = agent.status === 'TRIGGERED';

  // Determine if this agent requires bluetooth in live mode
  const requiresBle = agent.name === 'BEHAVIOUR_AGENT' && mode === 'LIVE';
  const bleMissing  = requiresBle && !bleConnected;

  const getAgentConfig = () => {
    switch (agent.name) {
      case 'SUSPICIOUS_PLACE':
        return { 
          title: 'Suspicious Place Classifier',            
          desc: 'Spatial corridor analysis & crime zone density indexing',              
          color: '#f59e0b', 
          bg: 'rgba(245,158,11,0.12)',  
          border: 'rgba(245,158,11,0.3)',  
          icon: <MapPin size={20} color="#f59e0b" /> 
        };
      case 'GPS_AGENT':
        return { 
          title: 'GPS Kinematics & Location Monitor',      
          desc: 'Live geofence, reverse geocoding & route deviation tracking',            
          color: '#38bdf8', 
          bg: 'rgba(56,189,248,0.12)', 
          border: 'rgba(56,189,248,0.3)', 
          icon: <MapPin size={20} color="#38bdf8" /> 
        };
      case 'BEHAVIOUR_AGENT':
        return { 
          title: 'Kinematic Behaviour & Motion Detector',    
          desc: 'Tri-axial accelerometer gait stability & erratic motion detection',     
          color: '#10b981', 
          bg: 'rgba(16,185,129,0.12)', 
          border: 'rgba(16,185,129,0.3)', 
          icon: <Activity size={20} color="#10b981" /> 
        };
      case 'VOICE_AGENT':
        return { 
          title: 'Acoustic Distress & Ambient Voice AI',   
          desc: 'Surrounding audio capture (10-15s) & keyword distress spotting',              
          color: '#a855f7', 
          bg: 'rgba(168,85,247,0.12)', 
          border: 'rgba(168,85,247,0.3)', 
          icon: <Mic size={20} color="#a855f7" /> 
        };
      case 'PANIC_GESTURE_AGENT':
        return { 
          title: 'Panic Gesture Monitor',   
          desc: 'Phone accelerometer shake-×3 detection & deliberate panic signal',           
          color: '#f43f5e', 
          bg: 'rgba(244,63,94,0.12)',  
          border: 'rgba(244,63,94,0.3)',  
          icon: <Vibrate size={20} color="#f43f5e" /> 
        };
      case 'RISK_FUSION_AGENT':
        return { 
          title: 'Corroborating Multi-Agent Risk Fusion',  
          desc: 'Bayesian multi-modal threat synthesis across all sensor streams',         
          color: '#06b6d4', 
          bg: 'rgba(6,182,212,0.12)',  
          border: 'rgba(6,182,212,0.3)',  
          icon: <ShieldAlert size={20} color="#06b6d4" /> 
        };
      case 'EMERGENCY_RESPONSE':
        return { 
          title: 'Autonomous Dispatch & Escalation',       
          desc: 'Autonomous emergency dispatch: SMS, live GPS tracking & speed dial',    
          color: '#ef4444', 
          bg: 'rgba(239,68,68,0.12)',  
          border: 'rgba(239,68,68,0.3)',  
          icon: <PhoneCall size={20} color="#ef4444" /> 
        };
      default:
        return { 
          title: agent.name,                               
          desc: 'Guardian Autonomous Security Agent',                                    
          color: '#6366f1', 
          bg: 'rgba(99,102,241,0.12)', 
          border: 'rgba(99,102,241,0.3)', 
          icon: <Cpu size={20} color="#6366f1" /> 
        };
    }
  };

  const getSourceBadgeStyle = (tag?: DataSourceTag) => {
    switch (tag) {
      case 'REAL BLUETOOTH':
      case 'REAL':         return { bg: 'rgba(16,185,129,0.16)',  color: '#10b981', border: 'rgba(16,185,129,0.4)',  label: 'REAL BLUETOOTH' };
      case 'DEMO GPS':     return { bg: 'rgba(245,158,11,0.16)',  color: '#f59e0b', border: 'rgba(245,158,11,0.4)',  label: 'DEMO GPS' };
      case 'DEMO AUDIO':   return { bg: 'rgba(168,85,247,0.16)',  color: '#c084fc', border: 'rgba(168,85,247,0.4)',  label: 'DEMO AUDIO' };
      case 'HYBRID':       return { bg: 'rgba(236,72,153,0.16)',  color: '#f472b6', border: 'rgba(236,72,153,0.4)',  label: 'HYBRID FUSION' };
      case 'SIMULATION':
      default:             return { bg: 'rgba(99,102,241,0.14)',  color: '#818cf8', border: 'rgba(99,102,241,0.35)', label: 'SIMULATION' };
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':  return { bg: 'rgba(220,38,38,0.18)',   color: '#ef4444', border: '#ef4444' };
      case 'HIGH_RISK': return { bg: 'rgba(249,115,22,0.18)',  color: '#f97316', border: '#f97316' };
      case 'SUSPICIOUS':return { bg: 'rgba(234,179,8,0.18)',   color: '#eab308', border: '#eab308' };
      case 'CAUTION':   return { bg: 'rgba(234,179,8,0.12)',   color: '#eab308', border: 'rgba(234,179,8,0.5)' };
      default:          return { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.4)' };
    }
  };

  const cfg         = getAgentConfig();
  const sourceStyle = getSourceBadgeStyle(agent.dataSource);
  const riskStyle   = getRiskColor(agent.riskLevel);
  const feats       = agent.features || {};

  // Build reasoning text
  let reasoningText = agent.reasoning || agent.message || 'Awaiting live sensor telemetry...';
  if (bleMissing && isWaiting) {
    if (agent.name === 'BEHAVIOUR_AGENT') {
      reasoningText = 'Smartwatch not paired. Connect a Bluetooth BLE smartwatch to stream wrist kinematics.';
    }
  }

  // Audio source — voiceRecordingUrl may be a blob:// URL from live mic recording, or an http:// URL
  // feats.audio_stream_url is either a relative path (/api/...) or full URL from the backend
  const audioPlayUrl = voiceRecordingUrl
    || (feats.audio_stream_url
      ? (feats.audio_stream_url.startsWith('http') ? feats.audio_stream_url : `http://localhost:8000${feats.audio_stream_url}`)
      : null);

  return (
    <div
      className="guardian-card"
      style={{
        padding: '20px 22px',
        backgroundColor: bleMissing && isWaiting ? 'var(--bg-subtle)' : 'var(--bg-surface)',
        border: isActive
          ? `2px solid ${cfg.color}`
          : isTriggered
          ? '2px solid #ef4444'
          : bleMissing && isWaiting
          ? '1.5px solid rgba(245,158,11,0.45)'
          : '1px solid var(--border-light)',
        boxShadow: isActive
          ? `0 0 24px ${cfg.bg}`
          : isTriggered
          ? 'var(--shadow-glow-red)'
          : 'var(--shadow-sm)',
        opacity: isWaiting && !bleMissing ? 0.75 : 1,
        transition: 'all 0.25s ease',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Active scanning bar */}
      {isActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
          animation: 'subtlePulse 1.5s infinite'
        }} />
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {cfg.icon}
          </div>
          <div>
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {cfg.title}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
              {cfg.desc}
            </p>
          </div>
        </div>

        {/* Status + Source Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {agent.dataSource && (
            <span style={{
              fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
              backgroundColor: sourceStyle.bg, color: sourceStyle.color,
              border: `1px solid ${sourceStyle.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap'
            }}>
              {sourceStyle.label}
            </span>
          )}
          {isActive ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '14px',
              backgroundColor: 'rgba(37,99,235,0.15)', color: '#3b82f6', border: '1px solid #3b82f6'
            }}>
              <Radio size={12} className="animate-spin" />
              ANALYZING
            </span>
          ) : isTriggered ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '14px',
              backgroundColor: '#dc2626', color: '#ffffff'
            }}>
              <AlertTriangle size={12} />
              DISPATCH TRIGGERED
            </span>
          ) : isCompleted ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '14px',
              backgroundColor: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}`
            }}>
              <CheckCircle2 size={12} />
              {agent.riskLevel || 'COMPLETED'}
            </span>
          ) : (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '14px',
              backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)'
            }}>
              STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Reasoning text */}
      <div style={{
        padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
        backgroundColor: 'var(--bg-subtle)',
        borderLeft: `3px solid ${isActive ? cfg.color : isCompleted ? riskStyle.color : 'var(--border-medium)'}`,
        borderTop: '1px solid var(--border-light)',
        borderRight: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5
      }}>
        {reasoningText}
      </div>

      {/* Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Risk Score</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: isCompleted ? riskStyle.color : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {agent.riskScore !== undefined && agent.riskScore > 0 ? `${Math.round(agent.riskScore)}/100` : '--'}
          </span>
        </div>
        <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Confidence</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {agent.confidence !== undefined && agent.confidence > 0 ? `${Math.round(agent.confidence * 100)}%` : '--'}
          </span>
        </div>
        <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Latency</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {agent.latencyMs ? `${agent.latencyMs}ms` : '--'}
          </span>
        </div>
      </div>

      {/* ============================================================
          AGENT 1: GPS AGENT TELEMETRY (Location Name + Google Maps)
          ============================================================ */}
      {agent.name === 'GPS_AGENT' && (isCompleted || isActive) && (
        <div style={{
          marginTop: '10px',
          padding: '12px 14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Live GPS Location Data
              </span>
            </div>
            {feats.google_maps_url ? (
              <a
                href={feats.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: '#38bdf8',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
              >
                <span>Google Maps</span>
                <ExternalLink size={11} />
              </a>
            ) : null}
          </div>

          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            📍 {feats.location_name || feats.area_context || 'Chennai Urban Corridor'}
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span><strong>Lat:</strong> {feats.latitude ? Number(feats.latitude).toFixed(5) : '13.08270'}</span>
            <span><strong>Lng:</strong> {feats.longitude ? Number(feats.longitude).toFixed(5) : '80.27070'}</span>
            {feats.accuracy_meters !== undefined && <span><strong>Accuracy:</strong> ±{Math.round(feats.accuracy_meters)}m</span>}
            {feats.speed_mps !== undefined && <span><strong>Speed:</strong> {feats.speed_mps} m/s</span>}
          </div>
        </div>
      )}

      {/* ============================================================
          AGENT 2: BEHAVIOURAL AGENT (User Motion Display)
          ============================================================ */}
      {agent.name === 'BEHAVIOUR_AGENT' && (isCompleted || isActive) && (
        <div style={{
          marginTop: '10px',
          padding: '12px 14px',
          borderRadius: '10px',
          backgroundColor: feats.motion_detected === false || (!bleConnected && mode === 'LIVE' && !feats.accel_magnitude)
            ? 'rgba(245, 158, 11, 0.10)'
            : 'rgba(16, 185, 129, 0.08)',
          border: feats.motion_detected === false || (!bleConnected && mode === 'LIVE' && !feats.accel_magnitude)
            ? '1px solid rgba(245, 158, 11, 0.35)'
            : '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Activity size={15} color={feats.motion_detected === false ? '#f59e0b' : '#10b981'} />
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: feats.motion_detected === false ? '#f59e0b' : '#10b981',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              User Motion & Kinematics
            </span>
          </div>

          {feats.motion_detected === false || (!bleConnected && mode === 'LIVE' && (!feats.accel_magnitude || feats.accel_magnitude === 0)) ? (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
                ⚠️ Motion cannot be detected
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Bluetooth smartwatch is not paired and device motion sensor is inactive. Pair a smartwatch to stream live wrist accelerometer data.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                🏃 Movement: {feats.motion_description || feats.movement_classification || (bleMotion?.isMoving ? 'Moving / Walking' : 'Stationary Baseline')}
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span><strong>Magnitude:</strong> {feats.accel_magnitude !== undefined ? `${Number(feats.accel_magnitude).toFixed(2)} m/s²` : (bleMotion?.magnitude ? `${bleMotion.magnitude.toFixed(2)} m/s²` : '9.80 m/s²')}</span>
                {feats.accel_x !== undefined && <span><strong>Axes:</strong> X:{feats.accel_x} Y:{feats.accel_y} Z:{feats.accel_z}</span>}
                <span><strong>Impact Shock:</strong> {feats.impact_detected ? '🚨 DETECTED' : 'None'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          AGENT 3: VOICE AGENT (Live Audio Recording + Playback)
          ============================================================ */}
      {agent.name === 'VOICE_AGENT' && (
        <>
          {/* Recording Countdown Bar */}
          {voiceCountdown > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '2.5px solid rgba(168,85,247,0.4)',
                borderTopColor: '#a855f7',
                animation: 'spin 1s linear infinite',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#a855f7', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {mode === 'LIVE' ? '🎙️ Recording Surrounding Sounds & Voices (12s Window)' : '🎙️ Processing Scenario Audio Sample...'}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {voiceCountdown}s remaining
                </span>
              </div>
              <div style={{ width: '80px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, ((mode === 'LIVE' ? 12 : 4) - voiceCountdown) / (mode === 'LIVE' ? 12 : 4) * 100))}%`,
                  backgroundColor: '#a855f7',
                  borderRadius: '3px',
                  transition: 'width 1s linear'
                }} />
              </div>
            </div>
          )}

          {/* Audio Player and Acoustic Details */}
          {audioPlayUrl && voiceCountdown === 0 && (
            <div style={{
              marginTop: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mic size={15} color="#a855f7" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recorded Surrounding Audio Evidence
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                  {feats.acoustic_classification || feats.audio_classification || 'Ambient Recording'}
                </span>
              </div>
              <audio
                controls
                src={audioPlayUrl}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  outline: 'none',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span><strong>Volume (RMS):</strong> {feats.rms_volume !== undefined ? `${Math.round(feats.rms_volume * 100)}%` : '--'}</span>
                <span><strong>Peak Pitch:</strong> {feats.peak_frequency_hz ? `${Math.round(feats.peak_frequency_hz)} Hz` : '--'}</span>
                <span><strong>Distress Spotting:</strong> {feats.distress_keywords_detected?.length ? feats.distress_keywords_detected.join(', ') : 'None (Ambient noises)'}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================
          AGENT 4: PANIC GESTURE AGENT (Shake × 3 & Rapid-Tap SOS)
          ============================================================ */}
      {agent.name === 'PANIC_GESTURE_AGENT' && (isCompleted || isActive) && (
        <div style={{
          marginTop: '10px',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: (panicTriggered || rapidTapTriggered)
            ? 'rgba(220, 38, 38, 0.12)'
            : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(244, 63, 94, 0.07)'),
          border: (panicTriggered || rapidTapTriggered)
            ? '1.5px solid rgba(220, 38, 38, 0.5)'
            : '1px solid rgba(244, 63, 94, 0.3)',
          boxShadow: (panicTriggered || rapidTapTriggered)
            ? '0 0 20px rgba(220, 38, 38, 0.25)'
            : 'none',
          transition: 'all 0.3s ease'
        }}>
          {/* Header & Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Vibrate size={18} color={(panicTriggered || rapidTapTriggered) ? '#dc2626' : '#f43f5e'} />
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: (panicTriggered || rapidTapTriggered) ? '#dc2626' : '#f43f5e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {(panicTriggered || rapidTapTriggered) ? '🚨 CRITICAL PANIC TRIGGERED' : 'Panic Gesture Monitor (Accelerometer)'}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Smartphone Motion & Rapid SOS Fallback
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: (panicTriggered || rapidTapTriggered)
                ? 'rgba(220, 38, 38, 0.2)'
                : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)'),
              color: (panicTriggered || rapidTapTriggered)
                ? '#dc2626'
                : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? '#f59e0b' : '#10b981'),
              border: `1px solid ${(panicTriggered || rapidTapTriggered) ? 'rgba(220,38,38,0.4)' : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.3)')}`,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: (panicTriggered || rapidTapTriggered) ? '#dc2626' : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? '#f59e0b' : '#10b981'),
                animation: (panicTriggered || rapidTapTriggered) ? 'pulse 1.2s infinite' : 'none'
              }} />
              {(panicTriggered || rapidTapTriggered)
                ? 'CRITICAL ALERT'
                : ((panicShakeCount || rapidTapCount || feats.shake_count || 0) > 0 ? `DETECTING (${panicShakeCount || rapidTapCount || feats.shake_count}/3)` : 'MONITORING')}
            </span>
          </div>

          {/* Shake Progress Indicator (1 → 2 → 3) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-medium, rgba(255,255,255,0.08))',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {[1, 2, 3].map(n => {
                const active = (panicShakeCount || feats.shake_count || 0) >= n || (panicTriggered || rapidTapTriggered);
                return (
                  <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? (n === 3 ? '#dc2626' : '#f43f5e') : 'rgba(255,255,255,0.05)',
                      color: active ? '#fff' : 'var(--text-muted)',
                      border: `2px solid ${active ? (n === 3 ? '#dc2626' : '#f43f5e') : 'rgba(255,255,255,0.15)'}`,
                      fontWeight: 900, fontSize: '13px', fontFamily: 'var(--font-mono)',
                      transition: 'all 0.3s ease',
                      boxShadow: active ? `0 0 10px rgba(244, 63, 94, 0.6)` : 'none'
                    }}>
                      {active && n === 3 ? '✓' : n}
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: active ? '#f43f5e' : 'var(--text-muted)' }}>
                      {n === 3 ? 'TRIGGER' : `SHAKE ${n}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'right', flex: 1, paddingLeft: '12px' }}>
              {(panicTriggered || rapidTapTriggered) ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626' }}>
                    {panicTriggerLabel || feats.trigger_label || 'Panic Shake Detected: 3 rapid shakes detected within 2.5s'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Immediate emergency escalation active
                  </div>
                </div>
              ) : (panicShakeCount || feats.shake_count || 0) > 0 ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b' }}>
                    {panicShakeCount || feats.shake_count} of 3 Shakes Registered
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    Shake phone again before window expires
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    3 Deliberate Shakes Required
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    Filters walking and normal phone movement
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Sensor Stream — X, Y, Z Readout */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Live Accelerometer Stream (m/s²)
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {liveMotion ? 'Live Device Sensor' : (feats.source || 'Simulated Stream')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { label: 'ACCEL X', val: liveMotion?.accelX ?? (feats.peak_magnitude ? 4.2 : 0.24) },
                { label: 'ACCEL Y', val: liveMotion?.accelY ?? (feats.peak_magnitude ? 6.8 : -0.42) },
                { label: 'ACCEL Z', val: liveMotion?.accelZ ?? (feats.peak_magnitude ? 18.5 : 9.81) },
                { label: 'MAGNITUDE', val: liveMotion?.magnitude ?? (feats.peak_magnitude || ((panicShakeCount || 0) > 0 ? 19.4 : 9.82)) }
              ].map(sensor => (
                <div key={sensor.label} style={{
                  padding: '6px 8px', borderRadius: '8px',
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-medium, rgba(255,255,255,0.08))',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {sensor.label}
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                    color: sensor.label === 'MAGNITUDE' && (sensor.val as number) > 15 ? '#f43f5e' : 'var(--text-primary)'
                  }}>
                    {typeof sensor.val === 'number' ? (sensor.val > 0 && sensor.label !== 'MAGNITUDE' ? `+${sensor.val.toFixed(2)}` : sensor.val.toFixed(2)) : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitivity & Timeout Configuration Controls */}
          <div style={{
            display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap',
            padding: '8px 10px', borderRadius: '8px',
            backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-medium, rgba(255,255,255,0.06))'
          }}>
            {/* Sensitivity */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Shake Sensitivity
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setSensitivity(lvl);
                      // LOW = harder to trigger (25 m/s²), MEDIUM = 18, HIGH = 12 (very sensitive)
                      const thresholdMap = { LOW: 25, MEDIUM: 18, HIGH: 12 } as const;
                      panicGestureService.updateThreshold(thresholdMap[lvl]);
                    }}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer',
                      border: sensitivity === lvl ? '1px solid #f43f5e' : '1px solid var(--border-medium, rgba(255,255,255,0.1))',
                      backgroundColor: sensitivity === lvl ? 'rgba(244,63,94,0.18)' : 'transparent',
                      color: sensitivity === lvl ? '#f43f5e' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeout */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Timeout Window
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {([2.0, 3.5, 5.0] as const).map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setTimeoutSec(sec);
                      // Convert seconds to ms for the service window
                      panicGestureService.updateWindowMs(sec * 1000);
                    }}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer',
                      border: timeoutSec === sec ? '1px solid #f43f5e' : '1px solid var(--border-medium, rgba(255,255,255,0.1))',
                      backgroundColor: timeoutSec === sec ? 'rgba(244,63,94,0.18)' : 'transparent',
                      color: timeoutSec === sec ? '#f43f5e' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {sec.toFixed(1)}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fallback Rapid-Tap Emergency Button (Hardware Key Alternative) */}
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', marginBottom: '2px' }}>
                  Hardware Key Alternative: Rapid-Tap SOS
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Tap 3 times rapidly within 2 seconds to force panic escalation
                </div>
              </div>

              <button
                type="button"
                onClick={handleRapidTap}
                disabled={panicTriggered || rapidTapTriggered}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  cursor: (panicTriggered || rapidTapTriggered) ? 'default' : 'pointer',
                  border: 'none',
                  backgroundColor: (panicTriggered || rapidTapTriggered) ? '#dc2626' : (rapidTapCount > 0 ? '#ef4444' : '#e11d48'),
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(225,29,72,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Smartphone size={14} />
                {(panicTriggered || rapidTapTriggered)
                  ? '🚨 SOS TRIGGERED'
                  : rapidTapCount > 0
                    ? `TAP AGAIN! (${rapidTapCount}/3)`
                    : 'TAP 3× FOR SOS'}
              </button>
            </div>
          </div>

          {/* Browser Limitation Note */}
          <div style={{
            padding: '6px 10px', borderRadius: '6px',
            backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)',
            fontSize: '10.5px', color: '#f59e0b', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'flex-start'
          }}>
            <span>⚠️</span>
            <span>
              <strong>Browser Limitation Note:</strong> Web security standards sandbox physical hardware volume keys (Volume Up/Down). The 3-Shake accelerometer gesture and on-screen Rapid-Tap SOS provide compliant zero-hardware distress activation.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
