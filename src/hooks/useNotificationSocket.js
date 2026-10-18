import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { API_BASE_URL } from '../services/api';

/**
 * useNotificationSocket
 * Connects to the backend WS endpoint with the user's JWT token.
 * Incoming messages are displayed as sonner toasts automatically.
 */
export function useNotificationSocket() {
  const token = useSelector((state) => state.auth.token);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/notifications?token=${encodeURIComponent(token)}`;
    let reconnectTimeout = null;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to notifications channel');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, text } = data;

          if (type === 'success') toast.success(text);
          else if (type === 'warning') toast.warning(text);
          else if (type === 'error') toast.error(text);
          else toast.info(text);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        console.warn('[WS] Connection error — will retry in 5s');
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected. Reconnecting in 5s…');
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [token]);
}
