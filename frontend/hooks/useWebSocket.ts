/**
 * WebSocket hook for real-time notifications
 *
 * Connects to the backend WebSocket endpoint and handles real-time events
 * like document completion notifications.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000/api/v1';

export interface WebSocketMessage {
  type: string;
  document_id?: string;
  filename?: string;
  message?: string;
  [key: string]: any;
}

export interface UseWebSocketOptions {
  onDocumentCompleted?: (data: { document_id: string; filename: string; message: string }) => void;
  onBannerUpdate?: (data: { banners: any[] }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    const token = getAccessToken();

    if (!token) {
      console.warn('No access token available, cannot connect to WebSocket');
      return;
    }

    try {
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      // Create new WebSocket connection with token as query parameter
      const wsUrl = `${WS_URL}/ws?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl.replace(token, '***'));

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        options.onConnect?.();

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          // Handle pong response
          if (event.data === 'pong') {
            return;
          }

          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          // Handle different message types
          switch (message.type) {
            case 'document_completed':
              if (message.document_id && message.filename && message.message) {
                options.onDocumentCompleted?.({
                  document_id: message.document_id,
                  filename: message.filename,
                  message: message.message
                });
              }
              break;
            case 'banner_update':
              if (message.banners) {
                options.onBannerUpdate?.({
                  banners: message.banners
                });
              }
              break;
            // Add more message types here as needed
            default:
              console.warn('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        options.onDisconnect?.();

        // Attempt to reconnect if not a normal closure and under max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current); // Exponential backoff
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnect attempts reached. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [options.onConnect, options.onDisconnect, options.onError, options.onDocumentCompleted, options.onBannerUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnecting');
      ws.current = null;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
}
