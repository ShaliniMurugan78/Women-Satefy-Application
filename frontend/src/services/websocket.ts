import { getBackendHost } from './api';

type WebSocketEventHandler = (event: { event_type: string; session_id: string; data: any }) => void;

class SafetyWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private handlers: Set<WebSocketEventHandler> = new Set();
  private reconnectTimeout: number | null = null;

  connect(sessionId: string) {
    if (this.socket && this.sessionId === sessionId && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.sessionId = sessionId;
    const wsUrl = `ws://${getBackendHost()}:8000/ws/safety/${sessionId}`;
    
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`WebSocket connected to session ${sessionId}`);
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.handlers.forEach(handler => handler(parsed));
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onclose = () => {
        console.log(`WebSocket closed for session ${sessionId}`);
      };

      this.socket.onerror = (error) => {
        console.warn('WebSocket connection error:', error);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.sessionId = null;
  }

  onEvent(handler: WebSocketEventHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const safetyWs = new SafetyWebSocketClient();
