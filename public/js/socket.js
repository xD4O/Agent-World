// ============================================================
// SOCKET.JS - WebSocket connection manager
// ============================================================

export class SocketManager {
  constructor(onMessage) {
    this.ws = null;
    this.onMessage = onMessage;
    this.connected = false;
    this.reconnectTimer = null;
    this.reconnectDelay = 2000;
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('[ws] Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.onMessage(msg);
        } catch (e) {
          console.error('[ws] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('[ws] Disconnected, reconnecting...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[ws] Error:', err);
      };
    } catch (e) {
      console.error('[ws] Connection failed:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
