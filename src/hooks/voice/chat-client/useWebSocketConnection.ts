
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { WS_URL } from './websocket-config';
import { createWebSocketConnection, cleanupWebSocketConnection } from './websocket-utils';
import { useWebSocketReconnection } from './useWebSocketReconnection';

/**
 * Hook for managing WebSocket connection to the voice chat server
 * with improved error handling and reconnection logic
 */
export const useWebSocketConnection = (messageHandler: (event: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  
  // Ref to hold the WebSocket instance
  const websocketRef = useRef<WebSocket | null>(null);
  
  // Function to start a new WebSocket connection with better error handling
  const startConnection = useCallback(async () => {
    if (websocketRef.current || isConnected) {
      console.log("[WebSocketConnection] Already connected or connecting");
      return;
    }
    
    // Optimistic UI update
    setIsConnected(false);
    setStatus('connecting');
    setConnectionError(null);
    
    try {
      console.log('[WebSocketConnection] Starting new connection');
      
      // Create a new WebSocket connection with timeout handling
      const { websocket, sessionId } = await createWebSocketConnection(
        WS_URL,
        // onOpen
        () => {
          setIsConnected(true);
          setStatus('connected');
          setConnectionError(null);
          resetReconnection();
        },
        // onMessage
        messageHandler,
        // onClose
        (event) => {
          setIsConnected(false);
          setStatus('disconnected');
          
          // Only attempt to reconnect if this wasn't a normal close
          if (event.code !== 1000 && event.code !== 1001) {
            attemptReconnection();
          } else {
            websocketRef.current = null;
          }
          
          // Show toast notification unless it was a normal closure
          if (event.code !== 1000) {
            toast.error("Disconnected from voice server", {
              description: `Connection closed (code: ${event.code})`,
              duration: 3000
            });
          }
        },
        // onError
        (error) => {
          setIsConnected(false);
          setStatus('error');
          setConnectionError('Connection error. Please try again.');
          console.error('[WebSocketConnection] Connection error:', error);
        }
      );
      
      // Store the WebSocket reference
      websocketRef.current = websocket;
      
      return sessionId;
      
    } catch (error) {
      console.error('[WebSocketConnection] Failed to start connection:', error);
      setIsConnected(false);
      setStatus('error');
      setConnectionError('Failed to connect. Please check your internet connection and try again.');
      
      // Show toast notification
      toast.error("Connection failed", {
        description: "Please try again.",
        duration: 3000
      });
      
      throw error;
    }
  }, [isConnected, messageHandler]);
  
  // Use the reconnection hook
  const {
    resetReconnection,
    attemptReconnection
  } = useWebSocketReconnection(startConnection);
  
  // Cleanup function to properly close the connection
  const closeConnection = useCallback(() => {
    resetReconnection();
    
    cleanupWebSocketConnection(websocketRef.current);
    websocketRef.current = null;
    
    // Reset state
    setIsConnected(false);
    setStatus('disconnected');
  }, [resetReconnection]);
  
  // Clean up WebSocket and timeouts on component unmount
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    isConnected,
    status,
    connectionError,
    websocketRef,
    startConnection,
    closeConnection
  };
};
