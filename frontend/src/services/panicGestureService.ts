/**
 * Panic Gesture Service
 * =====================
 * Detects deliberate THREE-SHAKE panic gestures using the phone's
 * DeviceMotionEvent API (real accelerometer, works in Chrome/Safari on iOS/Android).
 *
 * Architecture
 * ─────────────
 * A shake is defined as an acceleration burst (magnitude change > SHAKE_THRESHOLD m/s²)
 * that is clearly distinct from:
 *   - Normal walking (filtered via debounce)
 *   - Phone pickup / accidental movement (filtered via minimum hold time between shakes)
 *
 * Three valid shakes within SHAKE_WINDOW_MS trigger a PanicEvent which is:
 *   1. Fired locally (onShakeUpdate / onPanicTriggered callbacks).
 *   2. POSTed to the backend  /api/safety/telemetry/panic  for the
 *      backend Panic Gesture Agent to consume.
 *
 * Volume-Button Long-Press
 * ─────────────────────────
 * The W3C standard does NOT expose physical hardware volume-button events to
 * web applications.  Android Chrome intercepts volume keys for media control
 * and they cannot be captured with keydown/keyup.  iOS does not expose them at all.
 * We listen to `keydown` events (works when the key maps to a virtual keycode in some
 * controlled kiosk scenarios) but mark `volumeButtonSupported = false` so the UI
 * clearly communicates the limitation to the user.
 *
 * States
 * ───────
 * IDLE → MONITORING → DETECTING (shake 1/2 seen) → PANIC_TRIGGERED → COOLDOWN → MONITORING
 */

import { api } from './api';

// ──────────────────────────────────────────────────────────────────────────────
// Tuning constants (all configurable at construction time)
// ──────────────────────────────────────────────────────────────────────────────
const SHAKE_THRESHOLD_DEFAULT   = 18.0;   // m/s²  — delta magnitude above gravity to count as shake
const SHAKE_WINDOW_MS_DEFAULT   = 3500;   // ms    — window in which 3 shakes must occur
const MIN_SHAKE_INTERVAL_MS     = 300;    // ms    — debounce: min time between two registered shakes
const COOLDOWN_MS_DEFAULT       = 5000;   // ms    — after panic, suppress further events
const VOLUME_HOLD_MS_DEFAULT    = 2000;   // ms    — hold duration for volume-button long press

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────
export type PanicAgentState =
  | 'IDLE'
  | 'MONITORING'
  | 'DETECTING'
  | 'PANIC_TRIGGERED'
  | 'COOLDOWN'
  | 'CANCELLED';

export interface PanicEvent {
  triggerType:   'SHAKE_X3' | 'VOLUME_LONG_PRESS';
  triggerLabel:  string;
  shakeCount:    number;
  peakMagnitude: number | null;
  timestamp:     string;
  state:         PanicAgentState;
}

export interface PanicShakeUpdate {
  shakeCount:    number;    // 0, 1, 2, 3
  agentState:    PanicAgentState;
  peakMagnitude: number | null;
}

// ──────────────────────────────────────────────────────────────────────────────
class PanicGestureService {
  // ── Config ──────────────────────────────────────────────────────────────────
  private shakeThreshold  = SHAKE_THRESHOLD_DEFAULT;
  private shakeWindowMs   = SHAKE_WINDOW_MS_DEFAULT;
  private cooldownMs      = COOLDOWN_MS_DEFAULT;
  private volumeHoldMs    = VOLUME_HOLD_MS_DEFAULT;

  // ── State ────────────────────────────────────────────────────────────────────
  public  agentState:    PanicAgentState  = 'IDLE';
  private shakeCount:    number           = 0;
  private shakeTimestamps: number[]       = [];  // timestamps of each registered shake
  private lastShakeMs:   number           = 0;
  private peakMagnitude: number           = 0;
  private sessionId:      string | null    = null;
  private cooldownTimer:  ReturnType<typeof setTimeout> | null = null;
  private recoveryTimer:  ReturnType<typeof setTimeout> | null = null;

  // ── Motion tracking ──────────────────────────────────────────────────────────
  private prevMagnitude: number           = 9.81;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private motionAttached                  = false;

  // ── Volume button ────────────────────────────────────────────────────────────
  public  readonly volumeButtonSupported  = false;   // always false — web limitation
  private volumeKeyDown:  number | null   = null;    // pressed-at timestamp
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler:   ((e: KeyboardEvent) => void) | null = null;

  // ── Callbacks ────────────────────────────────────────────────────────────────
  private onShakeUpdateCbs:   Array<(update: PanicShakeUpdate) => void> = [];
  private onPanicTriggeredCbs: Array<(event: PanicEvent) => void>       = [];

  // ──────────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────────

  /** Attach listener for incremental shake count updates (for Shake 1→2→3 UI animation) */
  onShakeUpdate(cb: (update: PanicShakeUpdate) => void): () => void {
    this.onShakeUpdateCbs.push(cb);
    return () => { this.onShakeUpdateCbs = this.onShakeUpdateCbs.filter(c => c !== cb); };
  }

  /** Attach listener that fires exactly once when panic is confirmed */
  onPanicTriggered(cb: (event: PanicEvent) => void): () => void {
    this.onPanicTriggeredCbs.push(cb);
    return () => { this.onPanicTriggeredCbs = this.onPanicTriggeredCbs.filter(c => c !== cb); };
  }

  /**
   * Start monitoring.
   * @param sessionId  — current safety session ID (sent with each telemetry POST)
   * @param threshold  — override default shake threshold
   */
  start(sessionId: string | null = null, threshold?: number) {
    if (this.agentState !== 'IDLE' && this.agentState !== 'CANCELLED') return;
    this.sessionId      = sessionId;
    this.shakeCount     = 0;
    this.shakeTimestamps = [];
    this.peakMagnitude  = 0;
    this.lastShakeMs    = 0;
    if (threshold !== undefined) this.shakeThreshold = threshold;
    this._setState('MONITORING');
    this._attachMotion();
    this._attachVolumeKey();
    console.log('[PanicGesture] Monitoring started. Shake threshold:', this.shakeThreshold);
  }

  /** Update shake threshold on-the-fly (e.g. from UI sensitivity selector) */
  updateThreshold(threshold: number) {
    this.shakeThreshold = threshold;
    console.log('[PanicGesture] Threshold updated to', threshold);
  }

  /** Update the shake detection window on-the-fly (e.g. from UI timeout selector) */
  updateWindowMs(ms: number) {
    this.shakeWindowMs = ms;
    console.log('[PanicGesture] Window updated to', ms, 'ms');
  }

  /** Stop all listeners and reset state. */
  stop() {
    this._detachMotion();
    this._detachVolumeKey();
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.cooldownTimer = null;
    this.recoveryTimer = null;
    this._setState('CANCELLED');
  }

  /** Manually reset after a triggered panic (e.g., session ended). */
  reset() {
    this.shakeCount      = 0;
    this.shakeTimestamps = [];
    this.peakMagnitude   = 0;
    this.sessionId       = null;
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.cooldownTimer = null;
    this.recoveryTimer = null;
    this._setState('IDLE');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal — shake detection
  // ──────────────────────────────────────────────────────────────────────────────

  private _attachMotion() {
    if (this.motionAttached || typeof window === 'undefined') return;
    if (!('DeviceMotionEvent' in window)) {
      console.warn('[PanicGesture] DeviceMotionEvent not supported on this device.');
      return;
    }

    this.motionHandler = (e: DeviceMotionEvent) => this._handleMotion(e);

    // iOS 13+ requires explicit permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('devicemotion', this.motionHandler!);
            this.motionAttached = true;
          } else {
            console.warn('[PanicGesture] DeviceMotion permission denied.');
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', this.motionHandler);
      this.motionAttached = true;
    }
  }

  private _detachMotion() {
    if (this.motionHandler && this.motionAttached) {
      window.removeEventListener('devicemotion', this.motionHandler);
    }
    this.motionAttached = false;
    this.motionHandler  = null;
  }

  private _handleMotion(e: DeviceMotionEvent) {
    if (this.agentState !== 'MONITORING' && this.agentState !== 'DETECTING') return;

    const acc = e.accelerationIncludingGravity || { x: 0, y: 0, z: 9.81 };
    const x   = acc.x ?? 0;
    const y   = acc.y ?? 0;
    const z   = acc.z ?? 9.81;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Delta from previous magnitude — the key signal for a shake
    const delta = Math.abs(magnitude - this.prevMagnitude);
    this.prevMagnitude = magnitude;

    if (delta > this.shakeThreshold) {
      const now = Date.now();
      const elapsed = now - this.lastShakeMs;

      // Debounce: ignore if too close to the previous shake
      if (elapsed >= MIN_SHAKE_INTERVAL_MS) {
        this.lastShakeMs   = now;
        this.peakMagnitude = Math.max(this.peakMagnitude, delta);

        // Prune stale shakes outside the time window
        const windowStart = now - this.shakeWindowMs;
        this.shakeTimestamps = this.shakeTimestamps.filter(t => t > windowStart);
        this.shakeTimestamps.push(now);
        this.shakeCount = this.shakeTimestamps.length;

        console.log(`[PanicGesture] Shake detected! Count: ${this.shakeCount}, delta: ${delta.toFixed(1)} m/s²`);

        // Update state to DETECTING once first shake arrives
        if (this.shakeCount < 3) {
          this._setState('DETECTING');
          this._emitShakeUpdate();
          this._postPartialUpdate();   // push intermediate count to backend
        }

        if (this.shakeCount >= 3) {
          this._triggerPanic('SHAKE_X3');
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal — volume button detection (best-effort; always marked unsupported)
  // ──────────────────────────────────────────────────────────────────────────────

  private _attachVolumeKey() {
    if (typeof window === 'undefined') return;
    // Listen for keyboard events that might correspond to media/volume keys
    // in edge-case environments (e.g. kiosk mode or some Android WebViews).
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.code === 'AudioVolumeDown' || e.code === 'AudioVolumeUp' || e.key === 'VolumeDown' || e.key === 'VolumeUp') {
        e.preventDefault();
        if (!this.volumeKeyDown) {
          this.volumeKeyDown = Date.now();
        }
      }
    };
    this.keyupHandler = (e: KeyboardEvent) => {
      if ((e.code === 'AudioVolumeDown' || e.code === 'AudioVolumeUp' || e.key === 'VolumeDown' || e.key === 'VolumeUp') && this.volumeKeyDown) {
        const held = Date.now() - this.volumeKeyDown;
        this.volumeKeyDown = null;
        if (held >= this.volumeHoldMs && (this.agentState === 'MONITORING' || this.agentState === 'DETECTING')) {
          console.log(`[PanicGesture] Volume key held for ${held}ms — triggering panic.`);
          this._triggerPanic('VOLUME_LONG_PRESS');
        }
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup',   this.keyupHandler);
  }

  private _detachVolumeKey() {
    if (this.keydownHandler) window.removeEventListener('keydown', this.keydownHandler);
    if (this.keyupHandler)   window.removeEventListener('keyup',   this.keyupHandler);
    this.keydownHandler = null;
    this.keyupHandler   = null;
    this.volumeKeyDown  = null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal — panic trigger & cooldown
  // ──────────────────────────────────────────────────────────────────────────────

  private _triggerPanic(trigger: 'SHAKE_X3' | 'VOLUME_LONG_PRESS') {
    if (this.agentState === 'PANIC_TRIGGERED' || this.agentState === 'COOLDOWN') return;

    const label = trigger === 'SHAKE_X3' ? 'SHAKE × 3 DETECTED' : 'VOLUME LONG PRESS DETECTED';
    const event: PanicEvent = {
      triggerType:   trigger,
      triggerLabel:  label,
      shakeCount:    this.shakeCount,
      peakMagnitude: this.peakMagnitude > 0 ? Math.round(this.peakMagnitude * 10) / 10 : null,
      timestamp:     new Date().toISOString(),
      state:         'PANIC_TRIGGERED',
    };

    console.log('[PanicGesture] 🚨 PANIC TRIGGERED —', label);
    this._setState('PANIC_TRIGGERED');

    // Emit to local subscribers
    this._emitShakeUpdate();
    this.onPanicTriggeredCbs.forEach(cb => cb(event));

    // POST confirmed panic to backend
    this._postPanicEvent(event);

    // Enter cooldown — fires after exactly cooldownMs, then auto-returns to MONITORING
    this._setState('COOLDOWN');
    this.cooldownTimer = setTimeout(() => {
      this.cooldownTimer = null;
      this.recoveryTimer = setTimeout(() => {
        this.recoveryTimer = null;
        if (this.agentState === 'COOLDOWN') {
          this.shakeCount      = 0;
          this.shakeTimestamps = [];
          this.peakMagnitude   = 0;
          this._setState('MONITORING');
        }
      }, this.cooldownMs);
    }, 500);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal — API communication
  // ──────────────────────────────────────────────────────────────────────────────

  /** POST partial shake update (count = 1 or 2) to backend so live store shows progress. */
  private _postPartialUpdate() {
    const payload = {
      trigger_type:    'SHAKE_X3',
      shake_count:     this.shakeCount,
      panic_triggered: false,
      peak_magnitude:  this.peakMagnitude > 0 ? Math.round(this.peakMagnitude * 10) / 10 : null,
      timestamp:       new Date().toISOString(),
      session_id:      this.sessionId,
    };
    api.sendPanicGestureTelemetry(payload).catch(err =>
      console.warn('[PanicGesture] Partial update POST failed:', err)
    );
  }

  /** POST confirmed panic event to backend. */
  private _postPanicEvent(event: PanicEvent) {
    const payload = {
      trigger_type:    event.triggerType,
      shake_count:     event.shakeCount,
      panic_triggered: true,
      peak_magnitude:  event.peakMagnitude,
      timestamp:       event.timestamp,
      session_id:      this.sessionId,
    };
    api.sendPanicGestureTelemetry(payload).catch(err =>
      console.warn('[PanicGesture] Panic event POST failed:', err)
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Internal — state management & emissions
  // ──────────────────────────────────────────────────────────────────────────────

  private _setState(state: PanicAgentState) {
    this.agentState = state;
  }

  private _emitShakeUpdate() {
    const update: PanicShakeUpdate = {
      shakeCount:    this.shakeCount,
      agentState:    this.agentState,
      peakMagnitude: this.peakMagnitude > 0 ? Math.round(this.peakMagnitude * 10) / 10 : null,
    };
    this.onShakeUpdateCbs.forEach(cb => cb(update));
  }
}

// Singleton
export const panicGestureService = new PanicGestureService();
