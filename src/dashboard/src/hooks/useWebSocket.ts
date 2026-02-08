import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type WsStatus = "connecting" | "connected" | "disconnected";

interface WsMessage {
  channel: string;
  data: any;
  timestamp: number;
}

interface WsState {
  status: WsStatus;
  lastMessage: WsMessage | null;
  recentEvents: WsMessage[];
  lastUpdated: number | null;
}

// ── Singleton WebSocket manager (shared across all hook instances) ──

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 3000;

const wsManager = {
  ws: null as WebSocket | null,
  timer: null as ReturnType<typeof setTimeout> | null,
  attempts: 0,
  queryClient: null as ReturnType<typeof useQueryClient> | null,
  booted: false,
};

const subscribers = new Set<() => void>();

let state: WsState = {
  status: "disconnected",
  lastMessage: null,
  recentEvents: [],
  lastUpdated: null,
};

function setState(partial: Partial<WsState>) {
  state = { ...state, ...partial };
  subscribers.forEach((cb) => cb());
}

function getSnapshot(): WsState {
  return state;
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function shouldConnect(): boolean {
  // Don't connect on Vercel / production static hosting (no backend)
  // Only connect when in local dev
  const isLocalDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return isLocalDev;
}

function scheduleReconnect() {
  wsManager.attempts++;
  if (wsManager.attempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = BASE_DELAY * Math.pow(2, wsManager.attempts - 1);
    wsManager.timer = setTimeout(connect, delay);
  }
}

function connect() {
  if (!shouldConnect()) {
    setState({ status: "disconnected" });
    return;
  }

  if (wsManager.attempts >= MAX_RECONNECT_ATTEMPTS) {
    setState({ status: "disconnected" });
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  setState({ status: "connecting" });

  try {
    const ws = new WebSocket(wsUrl);
    wsManager.ws = ws;

    ws.onopen = () => {
      wsManager.attempts = 0;
      setState({ status: "connected" });
      ws.send(JSON.stringify({ type: "subscribe", channel: "transactions" }));
      ws.send(JSON.stringify({ type: "subscribe", channel: "matches" }));
      ws.send(JSON.stringify({ type: "subscribe", channel: "metrics" }));
      ws.send(JSON.stringify({ type: "subscribe", channel: "status" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        setState({
          lastMessage: msg,
          lastUpdated: msg.timestamp,
          recentEvents: [msg, ...state.recentEvents].slice(0, 50),
        });

        if (wsManager.queryClient) {
          switch (msg.channel) {
            case "transactions":
              wsManager.queryClient.invalidateQueries({ queryKey: ["transactions"] });
              break;
            case "matches":
              wsManager.queryClient.invalidateQueries({ queryKey: ["matches"] });
              wsManager.queryClient.invalidateQueries({ queryKey: ["timing-attack"] });
              break;
            case "metrics":
              wsManager.queryClient.invalidateQueries({ queryKey: ["metrics"] });
              wsManager.queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
              break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setState({ status: "disconnected" });
      wsManager.ws = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch {
    setState({ status: "disconnected" });
    scheduleReconnect();
  }
}

// ── Public hook ──

export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    wsManager.queryClient = queryClient;
    if (!wsManager.booted) {
      wsManager.booted = true;
      connect();
    }
  }, [queryClient]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  return {
    status: snapshot.status,
    lastMessage: snapshot.lastMessage,
    recentEvents: snapshot.recentEvents,
    lastUpdated: snapshot.lastUpdated,
  };
}
