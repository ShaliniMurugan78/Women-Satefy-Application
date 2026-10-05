import React, { useState, useEffect } from 'react';
import { bluetoothManager, BleDeviceInfo, BleConnectionStatus } from '../../bluetooth';
import { Bluetooth, X, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Activity, Battery, Cpu } from 'lucide-react';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({ isOpen, onClose }) => {
  const [bleState, setBleState] = useState<any>(bluetoothManager.getState());
  const [isScanning, setIsScanning] = useState(false);
  const isSupported = bluetoothManager.isSupported();

  useEffect(() => {
    const unsub = bluetoothManager.subscribe((state) => {
      setBleState(state);
      if (state.status === 'CONNECTED' || state.status === 'SUBSCRIBED' || state.status === 'ERROR') {
        setIsScanning(false);
      }
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    await bluetoothManager.scanAndConnect();
    setIsScanning(false);
  };

  const handleDisconnect = () => {
    bluetoothManager.disconnect();
  };

  const isConnected = bluetoothManager.isConnected();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                color: 'var(--primary-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(37, 99, 235, 0.3)'
              }}
            >
              <Bluetooth size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Bluetooth Smartwatch Manager
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Web Bluetooth API Sensor Binding
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Browser Web Bluetooth Support Banner */}
        {!isSupported && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#ef4444' }}>Web Bluetooth Not Detected:</strong> Please open in Google Chrome or Microsoft Edge on Desktop/Android, or enable <code>chrome://flags/#enable-web-bluetooth</code>.
            </div>
          </div>
        )}

        {/* Live Device Status Box */}
        <div
          style={{
            padding: '18px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-subtle)',
            border: `1.5px solid ${isConnected ? '#10b981' : 'var(--border-light)'}`,
            marginBottom: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Connection Telemetry
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                color: isConnected ? '#10b981' : 'var(--text-muted)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-light)'}`
              }}
            >
              {bleState.status}
            </span>
          </div>

          {isConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {bleState.device?.name || 'Paired Smartwatch'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({bleState.device?.id?.slice(0, 10)}...)
                </span>
              </div>

              {/* Heart Rate & Sensor readout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>HEART RATE (PPG)</span>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                    {bleState.latestHeartRate?.heartRate ? `${bleState.latestHeartRate.heartRate} BPM` : 'Streaming...'}
                  </div>
                </div>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>TELEMETRY STREAM</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    Active 1Hz Feed
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              No Bluetooth smartwatch or heart rate strap connected. Click Scan to discover nearby BLE wearables (Standard Heart Rate Service 0x180D).
            </p>
          )}

          {bleState.errorMessage && (
            <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#ef4444' }}>
              Error: {bleState.errorMessage}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Disconnect Wearable
            </button>
          ) : (
            <button
              onClick={handleStartScan}
              disabled={isScanning || !isSupported}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: isScanning || !isSupported ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {isScanning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Pairing with Device...
                </>
              ) : (
                <>
                  <Bluetooth size={15} />
                  Scan & Pair Smartwatch
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
