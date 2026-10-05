export type SafetyMode = 'LIVE' | 'HYBRID';
export type DataSourceTag = 'REAL' | 'SIMULATION' | 'HYBRID' | 'DEMO AUDIO' | 'REAL BLUETOOTH' | 'DEMO GPS';
export type ScenarioType = 'NORMAL' | 'CAUTION' | 'HIGH_RISK' | 'CRITICAL';
export type RiskLevel = 'SAFE' | 'CAUTION' | 'SUSPICIOUS' | 'HIGH_RISK' | 'CRITICAL';
export type AgentStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'TRIGGERED' | 'NOT_REQUIRED' | 'FAILED' | 'TIMEOUT' | 'SKIPPED';


export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmergencyContact {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_secondary: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface HeartRateBaseline {
  resting_bpm: number;
  walking_bpm: number;
  running_bpm: number;
  max_safe_bpm: number;
  last_calibrated_at: string;
}

export interface AgentEvent {
  id: number;
  session_id: string;
  agent_name: string;
  event_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  reasoning?: string;
  features?: Record<string, any>;
  latency_ms: number;
  timestamp: string;
}

export interface SafetySession {
  id: string;
  user_id: number;
  mode: SafetyMode;
  scenario: ScenarioType;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED' | 'FAILED';
  current_agent: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  initial_trigger_reason: string;
  location_lat?: number;
  location_lng?: number;
  started_at: string;
  ended_at?: string;
  events?: AgentEvent[];
}

export interface Incident {
  id: string;
  session_id: string;
  user_id: number;
  mode: SafetyMode;
  risk_score: number;
  risk_level: RiskLevel;
  started_at: string;
  ended_at: string;
  location_summary: string;
  timeline?: Array<Record<string, any>>;
  agent_breakdown?: Record<string, any>;
  emergency_action_taken: string;
  contact_notification_status: string;
  call_status: string;
  reasoning?: string;
  audio_recordings?: AudioRecording[];
}

export interface AudioRecording {
  id: number;
  session_id: string;
  filename: string;
  duration_seconds: number;
  file_size_bytes: number;
  rms_level: number;
  is_distress: boolean;
  recorded_at: string;
  mode: string;
  stream_url: string;
}

export interface SystemSettings {
  app_name: string;
  version: string;
  critical_threshold: number;
  high_threshold: number;
  suspicious_threshold: number;
  caution_threshold: number;
  workflow_timeout: number;
  fusion_weights: {
    gps: number;
    behaviour: number;
    voice: number;
    panic_gesture: number;
    context: number;
  };
  emergency_service_number: string;
  user_preferences: {
    critical_threshold: number;
    workflow_timeout: number;
    auto_call_enabled: boolean;
    audio_window_seconds: number;
    default_scenario: ScenarioType;
  };
}

export interface WatchStatus {
  device_name: string;
  device_address: string;
  is_connected: boolean;
  battery_level: number;
  last_heart_rate: number;
  last_seen: string;
}
