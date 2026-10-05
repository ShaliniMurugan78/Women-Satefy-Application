import React from 'react';
import { useSafety } from '../../context/SafetyContext';
import { Bluetooth, Radio, CheckCircle2, Zap, AlertCircle, Mic, Navigation, Activity } from 'lucide-react';

export const ModeBanner: React.FC = () => {
  const { mode, setMode, scenario, setScenario, liveSensorsState } = useSafety();

  const isLive = mode === 'LIVE';

  const themeColors = isLive
    ? {
        bg: 'rgba(6, 78, 59, 0.55)',
        border: 'rgba(16, 185, 129, 0.4)',
        badgeBg: '#10b981',
        text: '#a7f3d0'
      }
    : {
        bg: 'rgba(76, 29, 149, 0.55)',
        border: 'rgba(139, 92, 246, 0.4)',
        badgeBg: '#8b5cf6',
        text: '#ddd6fe'
      };

  const bannerLabel = isLive ? 'LIVE MODE — 100% REAL HARDWARE' : 'HYBRID DEMO MODE';

  const bannerDesc = isLive
    ? 'Streaming real device GPS, motion kinematics, live audio recording, & BLE smartwatch.'
    : 'Presentation sandbox: Real BLE smartwatch data fused with controllable risk scenarios.';

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: themeColors.bg,
        borderBottom: `1px solid ${themeColors.border}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '8px 20px',
        transition: 'all 0.3s ease',
        zIndex: 35
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Left: Mode Badge & Description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              backgroundColor: themeColors.badgeBg,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            {isLive ? (
              <Radio size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
            ) : (
              <Zap size={13} />
            )}
            {bannerLabel}
          </div>

          <span
            style={{
              fontSize: '11.5px',
              color: themeColors.text,
              opacity: 0.95,
              fontWeight: 500,
              display: 'inline-block'
            }}
          >
            {bannerDesc}
          </span>
        </div>

        {/* Right: Telemetry Indicators & 2-Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Active Sensor Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* BLE Status */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: liveSensorsState.bluetooth.connected
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: liveSensorsState.bluetooth.connected ? '#10b981' : '#f59e0b',
                border: `1px solid ${
                  liveSensorsState.bluetooth.connected
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(245, 158, 11, 0.3)'
                }`
              }}
            >
              <Bluetooth size={12} />
              {liveSensorsState.bluetooth.connected
                ? `BLE: ${liveSensorsState.bluetooth.deviceName || 'Connected'}`
                : 'BLE: Disconnected'}
            </span>

            {/* GPS Status */}
            {isLive ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: liveSensorsState.gps.lat
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(148, 163, 184, 0.15)',
                  color: liveSensorsState.gps.lat ? '#10b981' : '#94a3b8',
                  border: `1px solid ${
                    liveSensorsState.gps.lat ? 'rgba(16, 185, 129, 0.4)' : 'rgba(148, 163, 184, 0.25)'
                  }`
                }}
              >
                <CheckCircle2 size={12} />
                {liveSensorsState.gps.lat ? 'Live GPS' : 'Locating...'}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.35)'
                }}
              >
                <AlertCircle size={12} />
                Demo Route
              </span>
            )}

            {/* Mic / Live Audio Status */}
            {isLive && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: liveSensorsState.audio.isRecording
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  color: liveSensorsState.audio.isRecording ? '#ef4444' : '#10b981',
                  border: `1px solid ${
                    liveSensorsState.audio.isRecording
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(16, 185, 129, 0.4)'
                  }`
                }}
              >
                <Mic size={12} />
                {liveSensorsState.audio.isRecording ? 'Rec Mic' : 'Mic Ready'}
              </span>
            )}
          </div>

          {/* Scenario Selector in HYBRID mode */}
          {!isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#ddd6fe', fontWeight: 600 }}>Scenario:</span>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as any)}
                style={{
                  backgroundColor: 'rgba(30, 27, 75, 0.85)',
                  color: '#e0e7ff',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="CRITICAL">Critical Emergency (Scream + Surge)</option>
                <option value="HIGH_RISK">High Risk (Isolated Zone + Erratic Gait)</option>
                <option value="CAUTION">Caution (Crowd Noise + Tension)</option>
                <option value="NORMAL">Normal Safe (Walking Baseline)</option>
              </select>
            </div>
          )}

          {/* Segmented Mode Toggle (Only 2 Modes: Live vs Hybrid) */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              gap: '2px'
            }}
          >
            <button
              onClick={() => setMode('LIVE')}
              style={{
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isLive ? '#10b981' : 'transparent',
                color: isLive ? '#ffffff' : '#94a3b8',
                boxShadow: isLive ? '0 1px 4px rgba(16, 185, 129, 0.4)' : 'none'
              }}
            >
              Live Mode
            </button>
            <button
              onClick={() => setMode('HYBRID')}
              style={{
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: !isLive ? '#8b5cf6' : 'transparent',
                color: !isLive ? '#ffffff' : '#94a3b8',
                boxShadow: !isLive ? '0 1px 4px rgba(139, 92, 246, 0.4)' : 'none'
              }}
            >
              Hybrid Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
