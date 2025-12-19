"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { getAccessToken } from '@/lib/auth';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000/api/v1';

export interface WebSocketMessage {
  type: string;
  document_id?: string;
  filename?: string;
  message?: string;
  banners?: any[];
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const subscribers = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const isConnectedRef = useRef(false);
  const pingInterval = useRef<NodeJS.Timeout>();
  const isUnmounted = useRef(false);

  const connect = useCallback(() => {
    // Don't connect if component is unmounted
    if (isUnmounted.current) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      console.warn('No access token available, cannot connect to WebSocket');
      return;
    }

    try {
      // Close existing connection if any
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }

      const wsUrl = `${WS_URL}/ws?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl.replace(token, '***'));

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnectedRef.current = true;
        reconnectAttempts.current = 0;

        // Clear any existing ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        // Send ping every 30 seconds to keep connection alive
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          } else {
            if (pingInterval.current) {
              clearInterval(pingInterval.current);
            }
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

          // Notify all subscribers
          subscribers.current.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in WebSocket subscriber:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        isConnectedRef.current = false;

        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        // Don't reconnect if component is unmounted or normal closure
        if (isUnmounted.current || event.code === 1000) {
          return;
        }

        // Attempt to reconnect if not a normal closure and under max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnect attempts reached. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    isUnmounted.current = true;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnecting');
      ws.current = null;
    }
  }, []);

  const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribers.current.add(callback);

    // Return unsubscribe function
    return () => {
      subscribers.current.delete(callback);
    };
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmounted.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value: WebSocketContextType = {
    isConnected: isConnectedRef.current,
    subscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
