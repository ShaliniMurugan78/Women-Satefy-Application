import React, { useState, useEffect } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { 
  AlertTriangle, PhoneCall, MessageSquare, MapPin, ShieldAlert, 
  CheckCircle2, XCircle, Clock, ExternalLink, Radio, Volume2, ShieldCheck 
} from 'lucide-react';

interface EmergencyEscalationModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onViewIncidents?: () => void;
}

export const EmergencyEscalationModal: React.FC<EmergencyEscalationModalProps> = ({ isOpen = true, onClose, onViewIncidents }) => {
  const { escalationData, escalationEvents, cancelCurrentSession, mode } = useSafety();
  const [countdown, setCountdown] = useState<number>(10);
  const [simulatedCall, setSimulatedCall] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const lat = escalationData?.location_lat || 13.0827;
  const lng = escalationData?.location_lng || 80.2707;
  const mapUrl = escalationData?.map_url || `https://maps.google.com/?q=${lat},${lng}`;
  const userName = escalationData?.user_name || 'Guardian User';
  const contacts = escalationData?.contacts || [];

  const handleCancelAlarm = () => {
    cancelCurrentSession();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '620px',
          border: '2px solid #ef4444',
          boxShadow: 'var(--shadow-glow-red), 0 16px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Top Emergency Pulse Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)',
            animation: 'subtlePulse 1.2s infinite'
          }}
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #ef4444'
              }}
            >
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626', margin: 0, letterSpacing: '-0.02em' }}>
                CRITICAL THREAT ESCALATION
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Autonomous Emergency Dispatch Activated
              </span>
            </div>
          </div>

          {/* Countdown Pill */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={14} color="#dc2626" />
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
              Auto-Lock: {countdown}s
            </span>
          </div>
        </div>

        {/* Threat Alert Reason */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '16px',
            fontSize: '12.5px',
            color: 'var(--text-primary)',
            lineHeight: 1.5
          }}
        >
          {escalationData?.message || 'High confidence threat corroborated across multiple biometric & spatial sensory agents. Emergency dispatch triggered.'}
        </div>

        {/* Dispatch Pipeline Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {/* SMS Broadcast */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={16} color="#10b981" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                SMS Broadcast to Emergency Contacts
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: contacts.length > 0 ? '#10b981' : '#f59e0b' }}>
              {contacts.length > 0 ? `SENT (${contacts.length} Contact${contacts.length === 1 ? '' : 's'})` : 'NO CONTACTS CONFIGURED'}
            </span>
          </div>

          {/* Live GPS Fix */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="#38bdf8" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Live Monitored Location Encrypted & Shared
              </span>
            </div>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--primary-blue)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              View Pin <ExternalLink size={11} />
            </a>
          </div>

          {/* Police Speed Dial */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PhoneCall size={16} color="#ef4444" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                All-Women Police Helpdesk Hotline (1091)
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>
              CONNECTING
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCancelAlarm}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cancel False Alarm
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onViewIncidents && (
              <button
                onClick={onViewIncidents}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                View Incident Log
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sos)'
              }}
            >
              Acknowledge Alert
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
