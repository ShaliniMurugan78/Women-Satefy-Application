import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Mic, AlertCircle, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { AudioRecording } from '../../types';

interface IncidentAudioPlayerProps {
  recording: AudioRecording;
  index?: number;
}

export const IncidentAudioPlayer: React.FC<IncidentAudioPlayerProps> = ({ recording, index = 1 }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_seconds || 10);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Construct absolute URL for stream
  const token = localStorage.getItem('guardian_token') || '';
  const streamUrl = recording.stream_url.startsWith('http')
    ? recording.stream_url
    : `http://localhost:8000${recording.stream_url}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onError = () => {
      setLoadError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Playback error:', err);
        setLoadError(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Synthesize simulated acoustic bars for visual feedback
  const barCount = 28;
  const rms = recording.rms_level || 0.15;

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: '14px',
        background: recording.is_distress
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(30, 27, 75, 0.4) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
        border: `1.5px solid ${recording.is_distress ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.35)'}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        marginBottom: '12px',
        transition: 'all 0.2s ease'
      }}
    >
      <audio ref={audioRef} src={streamUrl} preload="metadata" />

      {/* Top Header: Recording title, metadata tags & download */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: recording.is_distress ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${recording.is_distress ? '#ef4444' : '#10b981'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: recording.is_distress ? '#ef4444' : '#10b981'
            }}
          >
            <Mic size={16} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Audio Evidence #{index} — {recording.filename || `Audio Chunk ${index}`}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Recorded at: {new Date(recording.recorded_at).toLocaleTimeString()} • {Math.round(recording.file_size_bytes / 1024)} KB
            </span>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: recording.mode === 'LIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: recording.mode === 'LIVE' ? '#10b981' : '#c4b5fd',
              border: `1px solid ${recording.mode === 'LIVE' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`,
              textTransform: 'uppercase'
            }}
          >
            {recording.mode} CLIP
          </span>

          {recording.is_distress ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10.5px',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                animation: 'pulse 2s infinite'
              }}
            >
              <AlertCircle size={12} />
              DISTRESS VOICE DETECTED (10s)
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: (recording.rms_level || 0) > 0.04 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                color: (recording.rms_level || 0) > 0.04 ? '#60a5fa' : '#34d399',
                border: `1px solid ${(recording.rms_level || 0) > 0.04 ? 'rgba(59, 130, 246, 0.35)' : 'rgba(16, 185, 129, 0.3)'}`
              }}
            >
              <CheckCircle2 size={12} />
              {(recording.rms_level || 0) > 0.04 ? 'NEARBY VOICE / AMBIENT (10s)' : 'AMBIENT SILENCE (10s)'}
            </span>
          )}

          {/* Download button */}
          <a
            href={streamUrl}
            download={recording.filename || `incident_audio_${recording.id}.webm`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            title="Download Audio File"
          >
            <Download size={13} />
            Download
          </a>
        </div>
      </div>

      {/* Visualizer bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          height: '32px',
          padding: '0 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderRadius: '8px',
          marginBottom: '10px'
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const played = (i / barCount) * 100 <= progressPercent;
          // Deterministic pseudorandom height based on index & rms
          const pseudoHeight = Math.max(
            15,
            Math.min(
              100,
              Math.sin(i * 0.7) * 35 + Math.cos(i * 1.3) * 20 + rms * 80 + 35
            )
          );

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${pseudoHeight}%`,
                borderRadius: '2px',
                backgroundColor: played
                  ? recording.is_distress ? '#ef4444' : '#10b981'
                  : 'rgba(255, 255, 255, 0.15)',
                transition: 'height 0.2s ease, background-color 0.15s ease',
                opacity: isPlaying ? 1 : 0.65
              }}
            />
          );
        })}
      </div>

      {/* Scrubber & Player Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: recording.is_distress ? '#dc2626' : 'var(--primary-blue)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            flexShrink: 0,
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" style={{ marginLeft: '2px' }} />}
        </button>

        {/* Progress bar / Scrubber */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              accentColor: recording.is_distress ? '#ef4444' : 'var(--primary-blue)',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {loadError && (
        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={13} />
          <span>Notice: Audio file preview stream not reachable or waiting for upload completion.</span>
        </div>
      )}
    </div>
  );
};
