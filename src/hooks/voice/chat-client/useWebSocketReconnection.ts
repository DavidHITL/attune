
import { useState, useRef, useCallback } from 'react';
import { MAX_RECONNECT_ATTEMPTS, RECONNECT_DELAY_MS } from './websocket-config';
import { handleReconnectionAttempt } from './websocket-utils';

/**
 * Hook for managing WebSocket reconnection attempts
 */
export const useWebSocketReconnection = (
  startConnection: () => Promise<any>
) => {
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Clear any pending reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // Reset reconnection state
  const resetReconnection = useCallback(() => {
    clearReconnectTimeout();
    setReconnectAttempts(0);
  }, [clearReconnectTimeout]);
  
  // Handle reconnection logic
  const attemptReconnection = useCallback(() => {
    clearReconnectTimeout();
    
    const shouldReconnect = handleReconnectionAttempt(
      reconnectAttempts,
      MAX_RECONNECT_ATTEMPTS,
      RECONNECT_DELAY_MS,
      (delay) => {
        timeoutRef.current = setTimeout(() => {
          console.log('[WebSocketReconnection] Attempting to reconnect...');
          startConnection().catch(error => {
            console.error('[WebSocketReconnection] Reconnection failed:', error);
          });
        }, delay);
      }
    );
    
    if (shouldReconnect) {
      setReconnectAttempts(prev => prev + 1);
    }
    
    return shouldReconnect;
  }, [reconnectAttempts, startConnection, clearReconnectTimeout]);
  
  return {
    reconnectAttempts,
    clearReconnectTimeout,
    resetReconnection,
    attemptReconnection
  };
};
