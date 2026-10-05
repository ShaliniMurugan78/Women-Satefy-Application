import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Incident, SafetyMode, AudioRecording } from '../types';
import { IncidentAudioPlayer } from '../components/safety/IncidentAudioPlayer';
import {
  History, ShieldAlert, CheckCircle2, ChevronRight, MapPin, Clock,
  Calendar, AlertOctagon, X, Mic, Volume2, Search, ExternalLink,
  PhoneCall, Shield, Activity, Radio, ArrowUpRight, Zap
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LIVE' | 'HYBRID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [modalAudioRecordings, setModalAudioRecordings] = useState<AudioRecording[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const modeParam = filterMode === 'ALL' ? undefined : (filterMode as SafetyMode);
      const data = await api.getIncidents(modeParam);
      setIncidents(data);
    } catch (e) {
      console.error('Error loading incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filterMode]);

  // When an incident is selected, load its audio recordings if not already included
  useEffect(() => {
    if (!selectedIncident) {
      setModalAudioRecordings([]);
      return;
    }

    if (selectedIncident.audio_recordings && selectedIncident.audio_recordings.length > 0) {
      setModalAudioRecordings(selectedIncident.audio_recordings);
    } else {
      // Query backend for audio recordings tied to this session
      setLoadingAudio(true);
      api.getSessionAudioRecordings(selectedIncident.session_id)
        .then((recs) => {
          setModalAudioRecordings(recs || []);
        })
        .catch((err) => {
          console.warn('Failed to load session audio recordings:', err);
          setModalAudioRecordings([]);
        })
        .finally(() => {
          setLoadingAudio(false);
        });
    }
  }, [selectedIncident]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#dc2626';
    if (score >= 60) return '#ef4444';
    if (score >= 40) return '#f97316';
    if (score >= 20) return '#eab308';
    return '#10b981';
  };

  // Filtered incidents by search
  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.id.toLowerCase().includes(q) ||
      (inc.location_summary && inc.location_summary.toLowerCase().includes(q)) ||
      (inc.reasoning && inc.reasoning.toLowerCase().includes(q))
    );
  });

  // KPI calculations
  const totalIncidents = incidents.length;
  const liveIncidents = incidents.filter(i => i.mode === 'LIVE').length;
  const criticalIncidents = incidents.filter(i => i.risk_score >= 70).length;
  const totalAudioClips = incidents.reduce((acc, curr) => acc + (curr.audio_recordings?.length || 0), 0);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1180px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.3)'
              }}
            >
              <History size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Incident Audit & Audio Evidence Log
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Permanent audit trail of escalated safety sessions, captured audio recordings, and multimodal corroboration.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills (2 Modes Only: Live or Hybrid) */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-subtle)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          {(['ALL', 'LIVE', 'HYBRID'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filterMode === m ? 'var(--bg-surface)' : 'transparent',
                color: filterMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: filterMode === m ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: filterMode === m ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {m === 'ALL' ? 'All Incidents' : m === 'LIVE' ? 'Live Hardware' : 'Hybrid Demo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}
      >
        <div className="guardian-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} color="#3b82f6" />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Incidents Logged</span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>{totalIncidents}</div>
          </div>
        </div>

        <div className="guardian-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={22} color="#10b981" />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Live Sensor Incidents</span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>{liveIncidents}</div>
          </div>
        </div>

        <div className="guardian-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertOctagon size={22} color="#ef4444" />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Critical Escalations</span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444' }}>{criticalIncidents}</div>
          </div>
        </div>

        <div className="guardian-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={22} color="#a855f7" />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Audio Evidence Clips</span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#a855f7' }}>{totalAudioClips}</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search incidents by ID, location, or risk reasoning..."
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            borderRadius: '12px',
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        />
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="guardian-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px auto' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading incident logs and audio evidence...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="guardian-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <History size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            No Incidents Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '440px', marginInline: 'auto' }}>
            {searchQuery
              ? 'No records match your query. Try clearing the search bar or changing the filter.'
              : 'Start a Live SOS or Hybrid Demo session to generate corroborated multi-agent incident audits.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredIncidents.map((inc) => {
            const isLive = inc.mode === 'LIVE';
            const audioCount = inc.audio_recordings?.length || 0;
            const hasDistressAudio = inc.audio_recordings?.some(a => a.is_distress);

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className="guardian-card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderLeft: `4px solid ${getRiskColor(inc.risk_score)}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Left side details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 auto', minWidth: 0 }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '14px',
                      backgroundColor: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                      border: `1.5px solid ${isLive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ShieldAlert size={26} color={getRiskColor(inc.risk_score)} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Incident #{inc.id}
                      </h3>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                          color: isLive ? '#10b981' : '#a78bfa',
                          border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`
                        }}
                      >
                        {isLive ? 'LIVE HARDWARE' : 'HYBRID DEMO'}
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-subtle)',
                          color: getRiskColor(inc.risk_score),
                          border: `1px solid ${getRiskColor(inc.risk_score)}40`
                        }}
                      >
                        Risk {Math.round(inc.risk_score)}/100 ({inc.risk_level})
                      </span>

                      {/* Audio indicator badge */}
                      {audioCount > 0 ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: hasDistressAudio ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: hasDistressAudio ? '#ef4444' : '#a855f7',
                            border: `1px solid ${hasDistressAudio ? '#ef4444' : '#a855f7'}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Mic size={11} />
                          {audioCount} Audio Recording{audioCount > 1 ? 's' : ''} (10s each)
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          No Audio Capture
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        {new Date(inc.started_at).toLocaleString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={13} />
                        {inc.location_summary || 'Coordinates logged'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIncident(inc);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Volume2 size={14} color="var(--primary-blue)" />
                    <span>Inspect & Listen</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incident Detail Inspection & Audio Evidence Modal */}
      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="guardian-card"
            style={{
              maxWidth: '760px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--bg-surface)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-surface)',
                zIndex: 10
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '19px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Incident #{selectedIncident.id}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: selectedIncident.mode === 'LIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: selectedIncident.mode === 'LIVE' ? '#10b981' : '#a78bfa',
                      border: `1px solid ${selectedIncident.mode === 'LIVE' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`
                    }}
                  >
                    {selectedIncident.mode === 'LIVE' ? 'LIVE INCIDENT' : 'HYBRID INCIDENT'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-subtle)',
                      color: getRiskColor(selectedIncident.risk_score),
                      border: `1px solid ${getRiskColor(selectedIncident.risk_score)}40`
                    }}
                  >
                    Risk: {Math.round(selectedIncident.risk_score)} ({selectedIncident.risk_level})
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Session ID: {selectedIncident.session_id} • Started: {new Date(selectedIncident.started_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* ═════════════════════════════════════════════════════════════ */}
              {/* 1. AUDIO RECORDINGS & VOICE EVIDENCE SECTION (USER HIGHLIGHT)  */}
              {/* ═════════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={16} color="#a855f7" />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Session Audio Evidence & 10-Second Acoustic Recordings
                    </h3>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {modalAudioRecordings.length} clip{modalAudioRecordings.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                {loadingAudio ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading audio recordings...</span>
                  </div>
                ) : modalAudioRecordings.length > 0 ? (
                  <div>
                    {modalAudioRecordings.map((rec, idx) => (
                      <IncidentAudioPlayer key={rec.id || idx} recording={rec} index={idx + 1} />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px dashed var(--border-medium)',
                      textAlign: 'center'
                    }}
                  >
                    <Volume2 size={24} color="var(--text-muted)" style={{ marginBottom: '6px', opacity: 0.5 }} />
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                      No microphone audio chunks were stored for this session. (Microphone was muted, inactive, or permissions were disabled during this session window).
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Executive Explainability Summary */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  marginBottom: '20px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Synthesized Multi-Agent Risk Arbitration
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {selectedIncident.reasoning || 'Multiple independent multimodal streams corroborated high risk threshold.'}
                </p>
              </div>

              {/* 3. Multi-Agent Contribution Breakdown */}
              {selectedIncident.agent_breakdown && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Multimodal Agent Risk Contribution Breakdown
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {Object.entries(selectedIncident.agent_breakdown).map(([agentName, agentData]: [string, any]) => (
                      <div
                        key={agentName}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-light)',
                          textAlign: 'center'
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
                          {agentName.replace('_AGENT', '').replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: 900, color: getRiskColor(agentData.risk_score || 0) }}>
                          {Math.round(agentData.risk_score || 0)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>
                          {agentData.risk_level || 'ANALYZED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Action Taken & Notification Status */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <PhoneCall size={16} color="#3b82f6" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>
                    Emergency Escalation Actions Executed
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {selectedIncident.emergency_action_taken}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>Contacts Notified: <strong>{selectedIncident.contact_notification_status}</strong></span>
                  <span>Automated Call: <strong>{selectedIncident.call_status}</strong></span>
                </div>
              </div>

              {/* 5. Telemetry Timeline */}
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Telemetry & Event Timeline
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedIncident.timeline.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'start',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-subtle)',
                          fontSize: '12px',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: 'var(--primary-blue)', minWidth: '140px' }}>
                          {item.event || item.event_type}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                          {item.data?.message || item.data?.reasoning || (item.score !== undefined ? `Risk Contribution Score: ${Math.round(item.score)}` : JSON.stringify(item.data || item))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
