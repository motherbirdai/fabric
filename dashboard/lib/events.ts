'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getStoredApiKey } from './api';

const GATEWAY_WS = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100')
  .replace(/^http/, 'ws');

export interface FabricEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface UseEventsOptions {
  /** Event types to subscribe to. Default: all ('*'). */
  events?: string[];
  /** Max events to keep in buffer. Default: 100. */
  maxBuffer?: number;
  /** Auto-reconnect on disconnect. Default: true. */
  autoReconnect?: boolean;
}

export function useEvents(options: UseEventsOptions = {}) {
  const { events = ['*'], maxBuffer = 100, autoReconnect = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [eventLog, setEventLog] = useState<FabricEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<FabricEvent | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const apiKey = getStoredApiKey();
    if (!apiKey) return;

    try {
      const ws = new WebSocket(`${GATEWAY_WS}/ws?key=${encodeURIComponent(apiKey)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to specific events
        if (events.length > 0 && !(events.length === 1 && events[0] === '*')) {
          ws.send(JSON.stringify({ type: 'subscribe', events }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as FabricEvent;
          if (event.type === 'connected' || event.type === 'subscribed' || event.type === 'pong') return;
          setLastEvent(event);
          setEventLog((prev) => [event, ...prev].slice(0, maxBuffer));
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (autoReconnect) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [events, maxBuffer, autoReconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearLog = useCallback(() => setEventLog([]), []);

  return { connected, lastEvent, eventLog, clearLog };
}
