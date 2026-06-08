import { getAccessToken } from "@/lib/api";

type EventHandler = (data: unknown) => void;

class DevSyncSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnect = 5;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private workspaceId: string | null = null;

  connect(workspaceId: string): void {
    this.workspaceId = workspaceId;
    const token = getAccessToken();
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}`;
    const url = `${wsBase}/ws/${workspaceId}?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected", {});
      this.pingInterval = setInterval(() => this.send({ event: "ping" }), 25000);
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { event: string; data?: unknown };
        if (msg.event === "pong") return;
        this.emit(msg.event, msg.data ?? msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.emit("disconnected", {});
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.emit("error", {});
    };
  }

  private scheduleReconnect(): void {
    if (!this.workspaceId || this.reconnectAttempts >= this.maxReconnect) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(this.workspaceId!), delay);
  }

  send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribeChannel(channelId: string): void {
    this.send({ event: "channel.subscribe", channel_id: channelId });
  }

  unsubscribeChannel(channelId: string): void {
    this.send({ event: "channel.unsubscribe", channel_id: channelId });
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
    this.workspaceId = null;
  }
}

export const socket = new DevSyncSocket();
