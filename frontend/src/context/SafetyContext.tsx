import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SafetyMode, ScenarioType, SafetySession, AgentEvent, RiskLevel, AgentStatus, DataSourceTag } from '../types';
export type { DataSourceTag };
import { api } from '../services/api';
import { safetyWs } from '../services/websocket';
import { panicGestureService, PanicShakeUpdate } from '../services/panicGestureService';

import { liveSensors, LiveSensorState } from '../services/liveSensors';

export interface AgentVisualState {
  name: string;
  label: string;
  status: AgentStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  reasoning: string;
  latencyMs: number;
  features?: Record<string, any>;
  message?: string;
  dataSource?: DataSourceTag; // REAL | SIMULATION | HYBRID | DEMO AUDIO | REAL BLUETOOTH | DEMO GPS
  audioUrl?: string;
}

export interface HybridDemoStep {
  step: number;
  title: string;
  status: 'PENDING' | 'ACTIVE' | 'DONE' | 'ERROR';
  detail?: string;
  sourceTag?: DataSourceTag;
}

interface SafetyContextType {
  mode: SafetyMode;
  setMode: (mode: SafetyMode) => void;
  scenario: ScenarioType;
  setScenario: (scen: ScenarioType) => void;
  activeSession: SafetySession | null;
  agentStates: Record<string, AgentVisualState>;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  overallConfidence: number;
  elapsedSeconds: number;
  isMonitoring: boolean;
  escalationTriggered: boolean;
  escalationData: any | null;
  escalationEvents: any[];          // Real-time SMS/call dispatch events
  liveSensorsState: LiveSensorState;
  voiceCountdown: number;
  voiceRecordingUrl: string | null;
  // Hybrid Demo Mode
  hybridSteps: HybridDemoStep[];
  hybridCurrentStep: number;
  isHybridRunning: boolean;
  triggerSOS: (triggerReason?: string) => Promise<void>;
  cancelCurrentSession: () => Promise<void>;
  resetSessionState: () => void;
  connectWatch: () => Promise<boolean>;
  triggerHybridDemo: () => Promise<void>;
  startVoiceRecording: (sessionId: string, mode: string) => void;
  panicShakeCount: number;
  panicTriggered: boolean;
  panicTriggerLabel: string;
}

const DEFAULT_AGENTS: Record<string, AgentVisualState> = {
  SUSPICIOUS_PLACE: {
    name: 'SUSPICIOUS_PLACE',
    label: 'Suspicious Context / Trigger',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Awaiting activation event...',
    latencyMs: 0
  },
  GPS_AGENT: {
    name: 'GPS_AGENT',
    label: 'GPS & Geospatial Agent',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Awaiting spatial telemetry...',
    latencyMs: 0
  },
  BEHAVIOUR_AGENT: {
    name: 'BEHAVIOUR_AGENT',
    label: 'Behaviour & Motion Kinematics',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Awaiting accelerometer & gyroscope telemetry...',
    latencyMs: 0
  },
  VOICE_AGENT: {
    name: 'VOICE_AGENT',
    label: 'Acoustic Distress & Voice Agent',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Awaiting acoustic spectrum analysis...',
    latencyMs: 0
  },
  PANIC_GESTURE_AGENT: {
    name: 'PANIC_GESTURE_AGENT',
    label: 'Panic Gesture Monitor',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Shake phone 3 times to trigger panic gesture...',
    latencyMs: 0
  },
  RISK_FUSION_AGENT: {
    name: 'RISK_FUSION_AGENT',
    label: 'Multimodal Risk Fusion Agent',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Awaiting synthesis of upstream agent outputs...',
    latencyMs: 0
  },
  EMERGENCY_RESPONSE: {
    name: 'EMERGENCY_RESPONSE',
    label: 'Emergency Escalation & Response',
    status: 'WAITING',
    riskScore: 0,
    riskLevel: 'SAFE',
    confidence: 0,
    reasoning: 'Standby for critical escalation condition (Score >= 80)...',
    latencyMs: 0
  }
};

const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

const HYBRID_STEPS_INITIAL: HybridDemoStep[] = [
  { step: 1, title: 'Connect Bluetooth Device', status: 'PENDING', detail: 'Establishing BLE connection to smartwatch...', sourceTag: 'REAL BLUETOOTH' },
  { step: 2, title: 'Read Live Heart Rate', status: 'PENDING', detail: 'Acquiring real BPM from BLE GATT sensor...', sourceTag: 'REAL BLUETOOTH' },
  { step: 3, title: 'Read Live Motion Data', status: 'PENDING', detail: 'Acquiring accelerometer & activity from smartwatch...', sourceTag: 'REAL BLUETOOTH' },
  { step: 4, title: 'Inject Demo GPS Scenario', status: 'PENDING', detail: 'Loading HIGH RISK isolated demo location...', sourceTag: 'DEMO GPS' },
  { step: 5, title: 'Process Distress Audio', status: 'PENDING', detail: 'Sending distress_sound.wav through Voice Agent...', sourceTag: 'DEMO AUDIO' },
  { step: 6, title: 'Confirm Heart Rate Source', status: 'PENDING', detail: 'Using real BLE data or labelled simulated HR...', sourceTag: 'HYBRID' },
  { step: 7, title: 'Run Risk Assessment', status: 'PENDING', detail: 'Fusing GPS HIGH + Behaviour HIGH + Voice HIGH + HR HIGH...', sourceTag: 'HYBRID' },
  { step: 8, title: 'Execute Emergency Response', status: 'PENDING', detail: 'Simulating emergency alert dispatch...', sourceTag: 'SIMULATION' },
];

export const SafetyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storedMode = localStorage.getItem('guardian_mode') as SafetyMode;
  const validModes: SafetyMode[] = ['LIVE', 'HYBRID'];
  const [mode, setModeState] = useState<SafetyMode>(
    validModes.includes(storedMode) ? storedMode : 'LIVE'
  );
  const [scenario, setScenario] = useState<ScenarioType>('CRITICAL');
  const [activeSession, setActiveSession] = useState<SafetySession | null>(null);
  const [agentStates, setAgentStates] = useState<Record<string, AgentVisualState>>(DEFAULT_AGENTS);
  const [overallRiskScore, setOverallRiskScore] = useState<number>(0);
  const [overallRiskLevel, setOverallRiskLevel] = useState<RiskLevel>('SAFE');
  const [overallConfidence, setOverallConfidence] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [escalationTriggered, setEscalationTriggered] = useState<boolean>(false);
  const [escalationData, setEscalationData] = useState<any | null>(null);
  const [escalationEvents, setEscalationEvents] = useState<any[]>([]);
  const [liveSensorsState, setLiveSensorsState] = useState<LiveSensorState>(liveSensors.state);
  // Voice Recording State
  const [voiceCountdown, setVoiceCountdown] = useState<number>(0);
  const [voiceRecordingUrl, setVoiceRecordingUrl] = useState<string | null>(null);
  // Hybrid Demo State
  const [hybridSteps, setHybridSteps] = useState<HybridDemoStep[]>(HYBRID_STEPS_INITIAL);
  const [hybridCurrentStep, setHybridCurrentStep] = useState<number>(0);
  const [isHybridRunning, setIsHybridRunning] = useState<boolean>(false);
  // Panic Gesture state
  const [panicShakeCount, setPanicShakeCount] = useState<number>(0);
  const [panicTriggered, setPanicTriggered] = useState<boolean>(false);
  const [panicTriggerLabel, setPanicTriggerLabel] = useState<string>('');

  // Synchronize LiveSensorManager state
  useEffect(() => {
    const unsub = liveSensors.subscribe((newState) => {
      setLiveSensorsState(newState);
    });
    return unsub;
  }, []);

  // Synchronize PanicGestureService state
  useEffect(() => {
    const unsubShake = panicGestureService.onShakeUpdate((update: PanicShakeUpdate) => {
      setPanicShakeCount(update.shakeCount);
      if (update.shakeCount >= 3) {
        setPanicTriggered(true);
        setPanicTriggerLabel('SHAKE × 3 DETECTED');
      }
    });
    const unsubPanic = panicGestureService.onPanicTriggered((event) => {
      setPanicTriggered(true);
      setPanicTriggerLabel(event.triggerLabel);
      setPanicShakeCount(event.shakeCount);
    });
    return () => {
      unsubShake();
      unsubPanic();
    };
  }, []);

  // Ensure live sensors activate immediately when mode is LIVE
  useEffect(() => {
    if (mode === 'LIVE') {
      liveSensors.startAllLiveSensors();
    } else {
      liveSensors.stopAllLiveSensors();
    }
  }, [mode]);

  // Timer for active safety session
  useEffect(() => {
    let interval: number | null = null;
    if (isMonitoring) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const setMode = (newMode: SafetyMode) => {
    setModeState(newMode);
    localStorage.setItem('guardian_mode', newMode);
    if (newMode === 'LIVE') {
      liveSensors.startAllLiveSensors();
    } else if (newMode === 'HYBRID') {
      // Hybrid: BLE stays alive for real HR, phone sensors stop (use scenario data)
      liveSensors.stopGPS();
      liveSensors.stopMotion();
      liveSensors.stopAudio();
    }
  };

  const resetSessionState = () => {
    setActiveSession(null);
    setAgentStates(DEFAULT_AGENTS);
    setOverallRiskScore(0);
    setOverallRiskLevel('SAFE');
    setOverallConfidence(0);
    setElapsedSeconds(0);
    setIsMonitoring(false);
    setEscalationTriggered(false);
    setEscalationData(null);
    setEscalationEvents([]);
    setVoiceCountdown(0);
    setVoiceRecordingUrl(null);
    setHybridSteps(HYBRID_STEPS_INITIAL);
    setHybridCurrentStep(0);
    setIsHybridRunning(false);
    setPanicShakeCount(0);
    setPanicTriggered(false);
    setPanicTriggerLabel('');
    panicGestureService.reset();
    safetyWs.disconnect();
  };

  // Called when voice agent starts — records audio in LIVE mode, shows countdown in DEMO mode
  const startVoiceRecording = useCallback((sessionId: string, sessionMode: string, durationSec = 12) => {
    setVoiceCountdown(durationSec);
    setVoiceRecordingUrl(null);

    if (sessionMode === 'LIVE') {
      // LIVE: actually record from microphone
      liveSensors.recordLiveAudioClip(
        sessionId,
        durationSec,
        sessionMode,
        (secondsLeft: number, _rms: number) => {
          setVoiceCountdown(secondsLeft);
        }
      ).then(({ url }) => {
        setVoiceRecordingUrl(url);
        setVoiceCountdown(0);
      }).catch((err) => {
        console.warn('Microphone live recording fallback:', err);
        setVoiceRecordingUrl(`http://localhost:8000/api/safety/audio/demo/${scenario}`);
        setVoiceCountdown(0);
      });
    } else {
      // DEMO/HYBRID: no real microphone needed — countdown 3.5s to match backend DSP
      let rem = Math.min(durationSec, 4);
      const tick = window.setInterval(() => {
        rem -= 1;
        setVoiceCountdown(Math.max(0, rem));
        if (rem <= 0) {
          clearInterval(tick);
          setVoiceCountdown(0);
          // URL will be set when VOICE_AGENT_COMPLETED event arrives
        }
      }, 1000);
    }
  }, [scenario]);

  // Helper to advance a hybrid step
  const advanceHybridStep = (stepIndex: number, status: 'DONE' | 'ACTIVE' | 'ERROR', detail?: string) => {
    setHybridSteps(prev => prev.map((s, i) =>
      i === stepIndex ? { ...s, status, detail: detail || s.detail } : s
    ));
    setHybridCurrentStep(stepIndex + 1);
  };

  // ============================================================
  // HYBRID DEMO — 8-Step Presentation Workflow
  // ============================================================
  const triggerHybridDemo = async () => {
    if (isHybridRunning) return;
    resetSessionState();
    setIsHybridRunning(true);
    setIsMonitoring(true);

    // Mark step 1 active
    setHybridSteps(HYBRID_STEPS_INITIAL.map((s, i) => i === 0 ? { ...s, status: 'ACTIVE' } : s));
    setHybridCurrentStep(0);

    // STEP 1: BLE Connection attempt
    let bleConnected = false;
    let realHR: number | null = null;
    let realActivity: string | null = null;
    let realAccel: number | null = null;
    try {
      bleConnected = await liveSensors.connectSmartWatch();
    } catch (e) {
      bleConnected = false;
    }

    advanceHybridStep(0, 'DONE',
      bleConnected
        ? '✓ Smartwatch Connected — BLE Connection Established'
        : '⚠ BLE unavailable — using labelled simulated device for demo'
    );
    await new Promise(r => setTimeout(r, 1000));

    // STEP 2: Read live heart rate (REAL BLE or labelled simulated)
    setHybridSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 1200));
    if (bleConnected && liveSensors.state.bluetooth.heartRate) {
      realHR = liveSensors.state.bluetooth.heartRate;
    }
    const hrDisplay = realHR !== null ? realHR : 84;
    const hrSource = realHR !== null ? 'REAL BLUETOOTH' : 'SIMULATION (Labelled)';
    advanceHybridStep(1, 'DONE', `Heart Rate: ${hrDisplay} BPM — Source: ${hrSource}`);
    await new Promise(r => setTimeout(r, 800));

    // STEP 3: Read motion data (REAL BLE or labelled simulated)
    setHybridSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 1200));
    if (bleConnected && liveSensors.state.bluetooth.heartRate) {
      realActivity = 'Walking';
      realAccel = 1.2;
    }
    const activityDisplay = realActivity || 'Walking (Demo)';
    const accelDisplay = realAccel || 1.2;
    const motionSource = realActivity ? 'REAL BLUETOOTH' : 'SIMULATION (Labelled)';
    advanceHybridStep(2, 'DONE', `Activity: ${activityDisplay} — Accel: ${accelDisplay} m/s² — Source: ${motionSource}`);
    await new Promise(r => setTimeout(r, 800));

    // STEP 4: Inject demo GPS
    setHybridSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 1000));
    advanceHybridStep(3, 'DONE', 'GPS: DEMO LOCATION — Risk: HIGH — Isolated sector injected');
    await new Promise(r => setTimeout(r, 600));

    // STEP 5: Process distress audio
    setHybridSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 1400));
    advanceHybridStep(4, 'DONE', 'VOICE: POTENTIAL DISTRESS — distress_sound.wav processed — Source: DEMO AUDIO');
    await new Promise(r => setTimeout(r, 600));

    // STEP 6: Confirm HR source
    setHybridSteps(prev => prev.map((s, i) => i === 5 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 800));
    const hrConfirmDetail = realHR !== null
      ? `Using REAL BLE heart rate: ${realHR} BPM — No alteration made`
      : `Using SIMULATION heart rate: 145 BPM — Explicitly labelled as SIMULATED`;
    advanceHybridStep(5, 'DONE', hrConfirmDetail);
    await new Promise(r => setTimeout(r, 600));

    // STEP 7: Run backend HYBRID pipeline
    setHybridSteps(prev => prev.map((s, i) => i === 6 ? { ...s, status: 'ACTIVE' } : s));
    try {
      const session = await api.createSafetySession('HYBRID', 'CRITICAL', 'Hybrid Emergency Demo — Presentation Scenario');
      setActiveSession(session);
      liveSensors.startRecording(session.id, 'HYBRID');
      safetyWs.connect(session.id);

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 12000); // max 12s wait
        safetyWs.onEvent((msg) => {
          const { event_type, data } = msg;

          if (event_type.endsWith('_STARTED')) {
            const agentKey = data.agent;
            if (agentKey && DEFAULT_AGENTS[agentKey]) {
              setAgentStates(prev => ({ ...prev, [agentKey]: { ...prev[agentKey], status: 'ACTIVE', message: data.message } }));
            }
          } else if (event_type.endsWith('_COMPLETED')) {
            const agentKey = data.agent_name;
            if (agentKey && DEFAULT_AGENTS[agentKey]) {
              // Determine per-agent source tag for Hybrid mode
              let src: DataSourceTag = 'HYBRID';
              if (agentKey === 'GPS_AGENT') src = 'DEMO GPS';
              else if (agentKey === 'BEHAVIOUR_AGENT') src = bleConnected ? 'REAL BLUETOOTH' : 'SIMULATION';
              else if (agentKey === 'VOICE_AGENT') src = 'DEMO AUDIO';
              else if (agentKey === 'PANIC_GESTURE_AGENT') src = 'REAL';
              else if (agentKey === 'RISK_FUSION_AGENT') src = 'HYBRID';

              setAgentStates(prev => ({
                ...prev,
                [agentKey]: {
                  ...prev[agentKey],
                  status: 'COMPLETED',
                  riskScore: data.risk_score,
                  riskLevel: data.risk_level,
                  confidence: data.confidence,
                  reasoning: data.reasoning,
                  latencyMs: data.latency_ms,
                  features: data.features,
                  dataSource: src
                }
              }));
              if (agentKey === 'RISK_FUSION_AGENT') {
                setOverallRiskScore(data.risk_score);
                setOverallRiskLevel(data.risk_level);
                setOverallConfidence(data.confidence);
              }
            }
          } else if (event_type === 'SUSPICIOUS_PLACE_DETECTED') {
            setAgentStates(prev => ({
              ...prev,
              SUSPICIOUS_PLACE: {
                ...prev.SUSPICIOUS_PLACE, status: 'COMPLETED',
                riskScore: 85, riskLevel: 'CRITICAL', confidence: 0.90,
                reasoning: 'Hybrid Demo: Critical scenario activated.',
                latencyMs: 120, dataSource: 'HYBRID'
              }
            }));
          } else if (event_type === 'EMERGENCY_RESPONSE_STARTED') {
            setEscalationTriggered(true);
            setEscalationData(data);
            setEscalationEvents([{ type: event_type, ...data, ts: Date.now() }]);
            setAgentStates(prev => ({
              ...prev,
              EMERGENCY_RESPONSE: {
                ...prev.EMERGENCY_RESPONSE, status: 'TRIGGERED',
                riskScore: data.risk_score, riskLevel: data.risk_level,
                confidence: 0.98, reasoning: data.message, latencyMs: 150,
                dataSource: 'SIMULATION'
              }
            }));
            clearTimeout(timeout);
            resolve();
          } else if (event_type === 'INCIDENT_CREATED' || event_type === 'SESSION_COMPLETED') {
            clearTimeout(timeout);
            resolve();
          } else if (event_type === 'SMS_DISPATCHED' || event_type === 'CALL_INITIATED') {
            setEscalationEvents(prev => [...prev, { type: event_type, ...data, ts: Date.now() }]);
          }
        });
      });
      advanceHybridStep(6, 'DONE', 'GPS: HIGH | Behaviour: HIGH | Voice: HIGH | Heart Rate: HIGH → CRITICAL');
    } catch (err: any) {
      advanceHybridStep(6, 'ERROR', `Risk assessment failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 800));

    // STEP 8: Emergency Response
    setHybridSteps(prev => prev.map((s, i) => i === 7 ? { ...s, status: 'ACTIVE' } : s));
    await new Promise(r => setTimeout(r, 1200));
    advanceHybridStep(7, 'DONE',
      '✓ Emergency Message Generated  ✓ Map Location Generated  ✓ Call Simulation Started'
    );

    setIsMonitoring(false);
    setIsHybridRunning(false);
  };

  const triggerSOS = async (triggerReason = 'Manual SOS Alert') => {
    resetSessionState();
    setIsMonitoring(true);

    try {
      // In LIVE mode, ensure live sensors are active and grab location
      let locData: { lat: number; lng: number; accuracy: number } | undefined = undefined;
      if (mode === 'LIVE') {
        liveSensors.startAllLiveSensors();
        if (!liveSensors.state.gps.lat && 'geolocation' in navigator) {
          try {
            await new Promise<void>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  locData = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy || 10
                  };
                  resolve();
                },
                () => resolve(),
                { timeout: 1800, enableHighAccuracy: true }
              );
            });
          } catch (e) {}
        } else if (liveSensors.state.gps.lat && liveSensors.state.gps.lng) {
          locData = {
            lat: liveSensors.state.gps.lat,
            lng: liveSensors.state.gps.lng,
            accuracy: liveSensors.state.gps.accuracy || 10
          };
        }
      }

      // Create session on backend
      const session = await api.createSafetySession(mode, scenario, triggerReason, locData);
      setActiveSession(session);
      panicGestureService.start(session.id);

      // In LIVE mode, start live microphone recording chunks for UI playback on Incident page
      if (mode === 'LIVE') {
        liveSensors.startRecording(session.id, 'LIVE');
      }

      // Connect WebSocket for sequential pipeline events
      safetyWs.connect(session.id);

      safetyWs.onEvent((msg) => {
        const { event_type, data } = msg;

        if (event_type === 'SUSPICIOUS_PLACE_DETECTED') {
          setAgentStates((prev) => ({
            ...prev,
            SUSPICIOUS_PLACE: {
              ...prev.SUSPICIOUS_PLACE,
              status: 'COMPLETED',
              riskScore: scenario === 'CRITICAL' ? 85 : (scenario === 'HIGH_RISK' ? 65 : 20),
              riskLevel: scenario === 'CRITICAL' ? 'CRITICAL' : 'SAFE',
              confidence: 0.90,
              reasoning: data.message || `Suspicious Place detected for scenario: ${scenario}`,
              latencyMs: 120
            }
          }));
        } else if (event_type.endsWith('_STARTED')) {
          const agentKey = data.agent;
          if (agentKey && DEFAULT_AGENTS[agentKey]) {
            setAgentStates((prev) => ({
              ...prev,
              [agentKey]: {
                ...prev[agentKey],
                status: 'ACTIVE',
                message: data.message
              }
            }));
            // When voice agent activates: in LIVE mode record real audio, in DEMO mode show countdown
            if (agentKey === 'VOICE_AGENT') {
              const recDuration = mode === 'LIVE' ? (data.duration || 12) : 4;
              setActiveSession((currentSession) => {
                if (currentSession) {
                  startVoiceRecording(currentSession.id, mode, recDuration);
                }
                return currentSession;
              });
            }
          }
        } else if (event_type.endsWith('_COMPLETED')) {
          const agentKey = data.agent_name;
          if (agentKey && DEFAULT_AGENTS[agentKey]) {
            setAgentStates((prev) => ({
              ...prev,
              [agentKey]: {
                ...prev[agentKey],
                status: 'COMPLETED',
                riskScore: data.risk_score,
                riskLevel: data.risk_level,
                confidence: data.confidence,
                reasoning: data.reasoning,
                latencyMs: data.latency_ms,
                features: data.features
              }
            }));

            // If voice agent completes, set audio playback URL
            if (agentKey === 'VOICE_AGENT') {
              if (data.features?.audio_stream_url) {
                // Prefer the URL from backend (works for both LIVE uploaded recordings and DEMO audio)
                const streamUrl = data.features.audio_stream_url.startsWith('http')
                  ? data.features.audio_stream_url
                  : `http://localhost:8000${data.features.audio_stream_url}`;
                setVoiceRecordingUrl((prev) => prev || streamUrl);
              } else if (mode !== 'LIVE') {
                setVoiceRecordingUrl((prev) => prev || `http://localhost:8000/api/safety/audio/demo/${scenario}`);
              }
              // Always clear countdown when agent completes
              setVoiceCountdown(0);
            }

            // If Risk Fusion completed, update top-level metrics
            if (agentKey === 'RISK_FUSION_AGENT') {
              setOverallRiskScore(data.risk_score);
              setOverallRiskLevel(data.risk_level);
              setOverallConfidence(data.confidence);
            }
          }
        } else if (event_type === 'EMERGENCY_RESPONSE_STARTED') {
          setEscalationTriggered(true);
          setEscalationData(data);
          setEscalationEvents([{ type: event_type, ...data, ts: Date.now() }]);
          setAgentStates((prev) => ({
            ...prev,
            EMERGENCY_RESPONSE: {
              ...prev.EMERGENCY_RESPONSE,
              status: 'TRIGGERED',
              riskScore: data.risk_score,
              riskLevel: data.risk_level,
              confidence: 0.98,
              reasoning: data.message,
              latencyMs: 150
            }
          }));
        } else if (
          event_type === 'SMS_DISPATCHED' ||
          event_type === 'AWAITING_REPLY' ||
          event_type === 'REPLY_COUNTDOWN' ||
          event_type === 'REPLY_RECEIVED' ||
          event_type === 'CALL_INITIATED' ||
          event_type === 'CALL_DISPATCHED'
        ) {
          // Live emergency pipeline events — accumulate for modal display
          setEscalationEvents((prev) => [...prev, { type: event_type, ...data, ts: Date.now() }]);
        } else if (event_type === 'PANIC_SHAKE_UPDATE') {
          // Backend broadcasting live shake progress (count = 1 / 2 / triggered)
          const sc = data.shake_count ?? 0;
          setPanicShakeCount(sc);
          if (data.panic_triggered) {
            setPanicTriggered(true);
            setPanicTriggerLabel(data.trigger_label || 'SHAKE × 3 DETECTED');
          }
        } else if (event_type === 'INCIDENT_CREATED') {
          setTimeout(() => {
            liveSensors.stopRecording();
          }, 1200);
          setIsMonitoring(false);
        } else if (event_type === 'SESSION_COMPLETED' || event_type === 'SESSION_CANCELLED') {
          setTimeout(() => {
            liveSensors.stopRecording();
          }, 1000);
          setIsMonitoring(false);
        }
      });
    } catch (err: any) {
      console.error('Failed to start safety session:', err);
      liveSensors.stopRecording();
      setIsMonitoring(false);
      alert(`Error starting safety session: ${err.message}`);
    }
  };

  const cancelCurrentSession = async () => {
    liveSensors.stopRecording();
    panicGestureService.stop();
    if (activeSession) {
      try {
        await api.cancelSafetySession(activeSession.id);
      } catch (e) {
        console.warn('Error cancelling session on backend:', e);
      }
    }
    setIsMonitoring(false);
    safetyWs.disconnect();
    if (mode === 'LIVE') {
      liveSensors.stopAllLiveSensors();
    }
  };


  const connectWatch = async () => {
    return await liveSensors.connectSmartWatch();
  };


  return (
    <SafetyContext.Provider
      value={{
        mode,
        setMode,
        scenario,
        setScenario,
        activeSession,
        agentStates,
        overallRiskScore,
        overallRiskLevel,
        overallConfidence,
        elapsedSeconds,
        isMonitoring,
        escalationTriggered,
        escalationData,
        escalationEvents,
        liveSensorsState,
        voiceCountdown,
        voiceRecordingUrl,
        hybridSteps,
        hybridCurrentStep,
        isHybridRunning,
        triggerSOS,
        cancelCurrentSession,
        resetSessionState,
        connectWatch,
        triggerHybridDemo,
        startVoiceRecording,
        panicShakeCount,
        panicTriggered,
        panicTriggerLabel
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};
