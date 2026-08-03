import { useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  projectId: string;
  onEvent?: (event: string, payload: any) => void;
}

export function useWebSocket({ projectId, onEvent }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!projectId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use api host but switch ports or protocols if needed
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const host = apiBase.startsWith('http')
      ? apiBase.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')
      : '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/api/v1/ws/${projectId}?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected to room:', projectId);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.event && onEvent) {
          onEvent(payload.event, payload);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.reason);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [projectId, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendEditing = useCallback((issueId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'user_editing', issue_id: issueId }));
    }
  }, []);

  const sendStoppedEditing = useCallback((issueId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'user_stopped_editing', issue_id: issueId }));
    }
  }, []);

  return {
    sendEditing,
    sendStoppedEditing,
  };
}
