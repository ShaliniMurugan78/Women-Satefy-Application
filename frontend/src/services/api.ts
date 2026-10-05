import { User, EmergencyContact, HeartRateBaseline, SafetySession, Incident, SystemSettings, WatchStatus, SafetyMode, ScenarioType } from '../types';

export const getBackendHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

export const API_BASE = `http://${getBackendHost()}:8000/api`;

class ApiService {
  private token: string | null = localStorage.getItem('guardian_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('guardian_token', token);
    } else {
      localStorage.removeItem('guardian_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(email: string, password: string, full_name: string, phone?: string): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, phone })
    });
    this.setToken(res.access_token);
    return res;
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // --- Emergency Contacts ---
  async getContacts(): Promise<EmergencyContact[]> {
    return this.request<EmergencyContact[]>('/contacts');
  }

  async createContact(contact: { name: string; phone: string; relationship?: string; is_primary?: boolean; is_secondary?: boolean }): Promise<EmergencyContact> {
    return this.request<EmergencyContact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact)
    });
  }

  async deleteContact(id: number): Promise<void> {
    await this.request(`/contacts/${id}`, { method: 'DELETE' });
  }

  // --- Safety Sessions ---
  async createSafetySession(mode: SafetyMode, scenario: ScenarioType, triggerReason?: string, location?: { lat: number; lng: number; accuracy: number }): Promise<SafetySession> {
    return this.request<SafetySession>('/safety/sessions', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        scenario,
        initial_trigger_reason: triggerReason || 'User Activated SOS Guardian Session',
        location_lat: location?.lat,
        location_lng: location?.lng,
        location_accuracy: location?.accuracy
      })
    });
  }

  async getSafetySession(sessionId: string): Promise<SafetySession> {
    return this.request<SafetySession>(`/safety/sessions/${sessionId}`);
  }

  async cancelSafetySession(sessionId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/safety/sessions/${sessionId}/cancel`, {
      method: 'POST'
    });
  }

  // --- Live Telemetry Ingest ---
  async sendGpsTelemetry(lat: number, lng: number, accuracy: number, speed = 0): Promise<void> {
    await this.request('/safety/telemetry/gps', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lng, accuracy, speed, is_mock: false })
    });
  }

  async sendSensorTelemetry(accel_x: number, accel_y: number, accel_z: number, gyro_x = 0, gyro_y = 0, gyro_z = 0): Promise<void> {
    await this.request('/safety/telemetry/sensor', {
      method: 'POST',
      body: JSON.stringify({ accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, is_mock: false })
    });
  }

  async sendAudioTelemetry(rms: number, peak_freq: number, centroid: number, keyword = false, phrase?: string): Promise<void> {
    await this.request('/safety/telemetry/audio', {
      method: 'POST',
      body: JSON.stringify({
        rms_volume: rms,
        peak_frequency_hz: peak_freq,
        spectral_centroid: centroid,
        distress_keyword_detected: keyword,
        distress_phrase: phrase,
        is_mock: false
      })
    });
  }

  async sendWatchTelemetry(hr: number, activity: string, status = 'CONNECTED'): Promise<void> {
    await this.request('/safety/telemetry/watch', {
      method: 'POST',
      body: JSON.stringify({ heart_rate: hr, activity_state: activity, sensor_status: status, is_mock: false })
    });
  }


  async sendPanicGestureTelemetry(data: {
    trigger_type: string;
    shake_count: number;
    panic_triggered: boolean;
    peak_magnitude?: number | null;
    timestamp?: string;
    session_id?: string | null;
  }): Promise<void> {
    await this.request('/safety/telemetry/panic', {
      method: 'POST',
      body: JSON.stringify({ ...data, is_mock: false })
    });
  }

  // --- Baselines & Devices ---
  async getBaseline(): Promise<HeartRateBaseline> {
    return this.request<HeartRateBaseline>('/safety/baseline');
  }

  async updateBaseline(baseline: Partial<HeartRateBaseline>): Promise<HeartRateBaseline> {
    return this.request<HeartRateBaseline>('/safety/baseline', {
      method: 'PUT',
      body: JSON.stringify(baseline)
    });
  }

  async getWatchStatus(): Promise<WatchStatus> {
    return this.request<WatchStatus>('/devices/watch');
  }

  // --- Incidents & Audio Recordings ---
  async getIncidents(mode?: SafetyMode): Promise<Incident[]> {
    const query = mode ? `?mode=${mode}` : '';
    return this.request<Incident[]>(`/incidents${query}`);
  }

  async getIncidentById(id: string): Promise<Incident> {
    return this.request<Incident>(`/incidents/${id}`);
  }

  async getSessionAudioRecordings(sessionId: string): Promise<import('../types').AudioRecording[]> {
    return this.request<import('../types').AudioRecording[]>(`/safety/audio/${sessionId}`);
  }

  getAudioStreamUrl(recordingId: number): string {
    return `${API_BASE}/safety/audio/stream/${recordingId}`;
  }


  // --- Settings ---
  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings');
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
}

export const api = new ApiService();
