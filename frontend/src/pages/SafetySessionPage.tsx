import React, { useState } from 'react';
import { useSafety } from '../context/SafetyContext';
import { PipelineVisualizer } from '../components/safety/PipelineVisualizer';
import { AgentCard } from '../components/safety/AgentCard';
import { RiskGauge } from '../components/safety/RiskGauge';
import { EmergencyEscalationModal } from '../components/safety/EmergencyEscalationModal';
import { ShieldAlert, Play, XCircle, RefreshCw, AlertTriangle, Bluetooth, BluetoothOff, Zap } from 'lucide-react';

interface SafetySessionPageProps {
  onNavigate: (tab: any) => void;
}

export const SafetySessionPage: React.FC<SafetySessionPageProps> = ({ onNavigate }) => {
  const {
    mode,
    scenario,
    activeSession,
    agentStates,
    overallRiskScore,
    overallRiskLevel,
    overallConfidence,
    elapsedSeconds,
    isMonitoring,
    escalationTriggered,
    liveSensorsState,
    voiceCountdown,
    voiceRecordingUrl,
    panicShakeCount,
    panicTriggered,
    panicTriggerLabel,
    triggerSOS,
    cancelCurrentSession,
    resetSessionState
  } = useSafety();

  // ---- BLE live state ----
  const bleConnected  = liveSensorsState.bluetooth.connected;
  const bleHeartRate  = liveSensorsState.bluetooth.heartRate;
  // Motion from BLE (via bluetoothManager) is stored in liveSensors.state.motion when BLE provides it
  const bleMotion = bleConnected ? {
    magnitude: liveSensorsState.motion.magnitude,
    isMoving:  liveSensorsState.motion.isMoving,
    activity:  liveSensorsState.motion.isMoving ? 'WALKING' : 'STATIONARY'
  } : undefined;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);

  // Auto-open escalation modal when emergency triggered
  React.useEffect(() => {
    if (escalationTriggered) {
      setShowEscalationModal(true);
    }
  }, [escalationTriggered]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    cancelCurrentSession();
    setShowCancelModal(false);
  };

  return (
    <div style={{ padding: '28px 20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Session Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Guardian Multi-Agent Safety Session
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: isMonitoring ? 'var(--color-high-risk-bg)' : 'var(--bg-subtle)',
                color: isMonitoring ? '#dc2626' : 'var(--text-muted)',
                border: `1px solid ${isMonitoring ? 'var(--color-high-risk-border)' : 'var(--border-light)'}`
              }}
            >
              {isMonitoring ? 'SESSION IN PROGRESS' : 'SESSION IDLE'}
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            {activeSession ? `Active Session ID: ${activeSession.id}` : 'Autonomous sequential multi-agent corroboration and risk arbitration pipeline'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isMonitoring ? (
            <button
              onClick={() => triggerSOS('Manual Pipeline Execution')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Play size={14} fill="#ffffff" />
              Start Safety Pipeline
            </button>
          ) : (
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-high-risk-bg)',
                color: '#dc2626',
                border: '1px solid var(--color-high-risk-border)',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              <XCircle size={15} />
              Cancel Session
            </button>
          )}

          <button
            onClick={resetSessionState}
            disabled={isMonitoring}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-medium)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: isMonitoring ? 'not-allowed' : 'pointer',
              opacity: isMonitoring ? 0.5 : 1
            }}
          >
            <RefreshCw size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Sequential Multi-Agent Pipeline Visualizer */}
      <div style={{ marginBottom: '20px' }}>
        <PipelineVisualizer agentStates={agentStates} />
      </div>



      {/* Main Grid: Left Sticky Metrics + Right Agent Stream */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Overall Risk Gauge & Workflow Timing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
          <RiskGauge
            score={overallRiskScore}
            level={overallRiskLevel}
            confidence={overallConfidence}
          />

          {/* Workflow Target Timing Card */}
          <div className="guardian-card" style={{ padding: '18px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Workflow Escalation Target
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatElapsed(elapsedSeconds)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 03:00 max</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
              Sequential fail-safe timeout prevents stalls. Every stage operates within calibrated real-time boundaries.
            </p>
          </div>

          {/* Mode Context Card */}
          <div className="guardian-card" style={{
            padding: '18px',
            backgroundColor:
              mode === 'LIVE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(124, 58, 237, 0.08)',
            border: `1.5px solid ${
              mode === 'LIVE' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(124, 58, 237, 0.35)'
            }`
          }}>
            <span style={{
              fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase',
              color: mode === 'LIVE' ? '#10b981' : '#8b5cf6'
            }}>
              Active Pipeline Mode
            </span>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {mode === 'LIVE' ? 'LIVE HARDWARE MODE' : `HYBRID DEMO (${scenario})`}
            </h4>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {mode === 'LIVE'
                ? 'Streaming real-time smartphone GPS coordinates, 3-axis motion accelerometer, and acoustic microphone streams.'
                : 'Fusing live smartphone telemetry with calibrated presentation risk scenarios.'}
            </p>
          </div>
        </div>


        {/* Right Column: Agent Cards Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <AgentCard agent={agentStates.SUSPICIOUS_PLACE} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} />
          <AgentCard agent={agentStates.GPS_AGENT} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} />
          <AgentCard agent={agentStates.BEHAVIOUR_AGENT} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} />
          <AgentCard agent={agentStates.VOICE_AGENT} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} voiceCountdown={voiceCountdown} voiceRecordingUrl={voiceRecordingUrl} />
          <AgentCard agent={agentStates.PANIC_GESTURE_AGENT} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} liveMotion={liveSensorsState.motion} mode={mode} panicShakeCount={panicShakeCount} panicTriggered={panicTriggered} panicTriggerLabel={panicTriggerLabel} />
          <AgentCard agent={agentStates.RISK_FUSION_AGENT} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} />
          <AgentCard agent={agentStates.EMERGENCY_RESPONSE} bleConnected={bleConnected} bleHeartRate={bleHeartRate} bleMotion={bleMotion} mode={mode} />
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.14)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Cancel Active Session?
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  This terminates all monitoring agents.
                </span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
              Are you sure you want to stop telemetry streaming? If you are in distress, keep the pipeline active for automated emergency escalation.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Keep Active
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Stop Monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Escalation Modal */}
      {showEscalationModal && (
        <EmergencyEscalationModal
          onClose={() => setShowEscalationModal(false)}
          onViewIncidents={() => {
            setShowEscalationModal(false);
            onNavigate('incidents');
          }}
        />
      )}


    </div>
  );
};
