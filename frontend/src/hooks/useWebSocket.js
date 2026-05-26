import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE } from '../context/AuthContext';

/**
 * Stable WebSocket hook.
 *
 * Key fix: the STOMP client is created once per `topic` change only.
 * The `onMessageReceived` callback is stored in a ref so it can be
 * updated on every render WITHOUT tearing down and re-creating the
 * STOMP connection. This prevents the reconnect loop that was clearing
 * all dashboard state after pipeline execution.
 */
export const useWebSocket = (topic, onMessageReceived) => {
  // Store the latest callback in a ref — never triggers useEffect
  const callbackRef = useRef(onMessageReceived);
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }); // runs after every render to keep ref fresh

  useEffect(() => {
    if (!topic) return; // null topic = intentionally inactive subscription

    const wsUrl = API_BASE
      ? `${API_BASE}/ws`
      : `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.host}/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      client.subscribe(topic, (message) => {
        if (!message.body) return;
        try {
          const data = JSON.parse(message.body);
          // Always call the LATEST version of the callback via ref
          callbackRef.current?.(data);
        } catch {
          callbackRef.current?.(message.body);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('[WebSocket] STOMP broker error:', frame);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]); // ONLY re-create the client when the topic itself changes
};
