import React from 'react';
import { AgentVisualState } from '../../context/SafetyContext';
import { CheckCircle2, Circle, AlertTriangle, ShieldAlert, Sparkles, Clock } from 'lucide-react';

interface PipelineVisualizerProps {
  agentStates: Record<string, AgentVisualState>;
}

const PIPELINE_ORDER = [
  'SUSPICIOUS_PLACE',
  'GPS_AGENT',
  'BEHAVIOUR_AGENT',
  'VOICE_AGENT',
  'PANIC_GESTURE_AGENT',
  'RISK_FUSION_AGENT',
  'EMERGENCY_RESPONSE'
];

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ agentStates }) => {
  return (
    <div
      className="guardian-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        overflowX: 'auto',
        gap: '8px'
      }}
    >
      {PIPELINE_ORDER.map((agentKey, index) => {
        const agent = agentStates[agentKey];
        if (!agent) return null;

        const isCompleted = agent.status === 'COMPLETED';
        const isActive = agent.status === 'ACTIVE';
        const isTriggered = agent.status === 'TRIGGERED';

        return (
          <React.Fragment key={agentKey}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '100px',
                textAlign: 'center'
              }}
            >
              {/* Status Circle */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isTriggered
                    ? 'var(--color-high-risk-bg)'
                    : isCompleted
                    ? 'var(--color-safe-bg)'
                    : isActive
                    ? 'rgba(37, 99, 235, 0.15)'
                    : 'var(--bg-subtle)',
                  border: `2px solid ${
                    isTriggered
                      ? '#ef4444'
                      : isCompleted
                      ? '#10b981'
                      : isActive
                      ? 'var(--primary-blue)'
                      : 'var(--border-medium)'
                  }`,
                  color: isTriggered
                    ? '#dc2626'
                    : isCompleted
                    ? '#10b981'
                    : isActive
                    ? 'var(--primary-blue)'
                    : 'var(--text-muted)',
                  boxShadow: isActive
                    ? '0 0 12px rgba(37, 99, 235, 0.4)'
                    : isTriggered
                    ? '0 0 14px rgba(239, 68, 68, 0.5)'
                    : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={20} />
                ) : isTriggered ? (
                  <ShieldAlert size={20} />
                ) : isActive ? (
                  <Clock size={18} className="animate-spin" />
                ) : (
                  <Circle size={16} />
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive || isCompleted || isTriggered ? 700 : 500,
                  color: isTriggered
                    ? '#dc2626'
                    : isCompleted
                    ? 'var(--text-primary)'
                    : isActive
                    ? 'var(--primary-blue)'
                    : 'var(--text-muted)',
                  marginTop: '8px',
                  lineHeight: '1.2'
                }}
              >
                {agentKey.replace('_AGENT', '').replace('_', ' ')}
              </span>

              {/* Status Pill */}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginTop: '3px',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: isTriggered
                    ? 'var(--color-high-risk-bg)'
                    : isCompleted
                    ? 'var(--color-safe-bg)'
                    : isActive
                    ? 'rgba(37, 99, 235, 0.15)'
                    : 'var(--bg-subtle)',
                  color: isTriggered
                    ? '#dc2626'
                    : isCompleted
                    ? '#16a34a'
                    : isActive
                    ? 'var(--primary-blue)'
                    : 'var(--text-muted)'
                }}
              >
                {agent.status}
              </span>
            </div>

            {/* Connecting Line */}
            {index < PIPELINE_ORDER.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: isCompleted || isTriggered ? '#10b981' : (isActive ? 'var(--primary-blue)' : 'var(--border-light)'),
                  minWidth: '20px',
                  margin: '0 4px',
                  marginBottom: '28px',
                  transition: 'background-color 0.3s ease'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
