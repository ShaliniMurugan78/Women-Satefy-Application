import React from 'react';
import { RiskLevel } from '../../types';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  confidence: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, confidence }) => {
  const getLevelColor = () => {
    switch (level) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH_RISK': return '#ef4444';
      case 'SUSPICIOUS': return '#f97316';
      case 'CAUTION': return '#eab308';
      default: return '#10b981';
    }
  };

  const getLevelBackground = () => {
    switch (level) {
      case 'CRITICAL': return 'var(--color-critical-bg)';
      case 'HIGH_RISK': return 'var(--color-high-risk-bg)';
      case 'SUSPICIOUS': return 'var(--color-suspicious-bg)';
      case 'CAUTION': return 'var(--color-caution-bg)';
      default: return 'var(--color-safe-bg)';
    }
  };

  // SVG circular gauge math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className="guardian-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--bg-subtle)"
            strokeWidth="12"
          />
          {/* Animated risk score stroke */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={getLevelColor()}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>

        {/* Center Text */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {Math.round(score)}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
            Risk Index
          </span>
        </div>
      </div>

      {/* Risk Badge */}
      <div
        style={{
          marginTop: '16px',
          padding: '6px 16px',
          borderRadius: '20px',
          backgroundColor: getLevelBackground(),
          border: `1px solid ${getLevelColor()}`,
          color: getLevelColor(),
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.04em'
        }}
      >
        {level.replace('_', ' ')}
      </div>

      {/* Confidence metric */}
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
        Confidence: <strong>{Math.round(confidence * 100)}%</strong>
      </span>
    </div>
  );
};
