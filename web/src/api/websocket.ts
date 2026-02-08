// WebSocket client for real-time events

export interface WSMessage {
  type: string;
  timestamp: string;
  data?: unknown;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectInterval = 5000;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private connected = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connection.open', {});
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.emit('connection.close', {});
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('connection.error', { error });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(eventType: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  subscribeAll(handler: MessageHandler): () => void {
    return this.subscribe('*', handler);
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  ping(): void {
    this.send({ type: 'ping', timestamp: new Date().toISOString() });
  }

  private handleMessage(message: WSMessage): void {
    // Call specific handlers
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  private emit(type: string, data: unknown): void {
    this.handleMessage({
      type,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }
}

export const wsClient = new WebSocketClient();

// Event types
export const WSEvents = {
  // Game events
  ACHIEVEMENT_UNLOCKED: 'game.achievement.unlocked',
  LEVEL_UP: 'game.level.up',
  CURRENCY_EARNED: 'game.currency.earned',
  CHALLENGE_COMPLETED: 'game.challenge.completed',
  IMAGE_SCORED: 'game.image.scored',

  // Sky events
  CONDITIONS_CHANGED: 'sky.conditions.changed',
  TARGET_RISING: 'sky.target.rising',
  TWILIGHT_STARTED: 'sky.twilight.started',

  // Device events
  DEVICE_CONNECTED: 'device.connected',
  DEVICE_DISCONNECTED: 'device.disconnected',
  DEVICE_PROPERTY_CHANGED: 'device.property.changed',

  // Capture events
  CAPTURE_STARTED: 'capture.started',
  CAPTURE_COMPLETED: 'capture.completed',
  CAPTURE_FAILED: 'capture.failed',

  // Focus events
  FOCUS_STARTED: 'focus.started',
  FOCUS_COMPLETED: 'focus.completed',
  FOCUS_STEP: 'focus.step',

  // Guide events
  GUIDE_STARTED: 'guide.started',
  GUIDE_STOPPED: 'guide.stopped',
  GUIDE_CORRECTION: 'guide.correction',

  // Mount events
  MOUNT_POSITION: 'mount.position',
  MOUNT_SLEW_STARTED: 'mount.slew.started',
  MOUNT_SLEW_COMPLETED: 'mount.slew.completed',
  MOUNT_TRACKING_CHANGED: 'mount.tracking.changed',
} as const;
