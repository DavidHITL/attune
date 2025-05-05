import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Define the WebSocket URL
const WS_URL = import.meta.env.VITE_ATTUNE_WEBSOCKET_URL || 'ws://localhost:8080';

// Maximum number of reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

/**
 * Hook for managing WebSocket connection to the voice chat server
 * with improved error handling and reconnection logic
 */
export const useWebSocketConnection = (messageHandler: (event: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Ref to hold the WebSocket instance
  const websocketRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup timeout helper
  const clearReconnectTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  
  // Cleanup function to properly close the connection
  const closeConnection = useCallback(() => {
    clearReconnectTimeout();
    
    if (websocketRef.current) {
      // Remove event listeners to prevent memory leaks
      websocketRef.current.onopen = null;
      websocketRef.current.onmessage = null;
      websocketRef.current.onclose = null;
      websocketRef.current.onerror = null;
      
      // Close the connection
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Reset state
    setIsConnected(false);
    setStatus('disconnected');
    setReconnectAttempts(0);
  }, []);

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
      // Generate a unique session ID
      const sessionId = uuidv4();
      
      console.log(`[WebSocketConnection] Starting connection with session ID: ${sessionId}`);
      
      // Create a new WebSocket connection with timeout handling
      const connectWithTimeout = () => {
        return new Promise<string>((resolve, reject) => {
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            reject(new Error('Connection timed out'));
          }, 10000); // 10 second timeout
          
          // Create WebSocket
          websocketRef.current = new WebSocket(`${WS_URL}?session_id=${sessionId}`);
          
          // Set up WebSocket event listeners
          websocketRef.current.onopen = () => {
            clearTimeout(connectionTimeout);
            console.log('[WebSocketConnection] Connection opened successfully');
            setIsConnected(true);
            setStatus('connected');
            setConnectionError(null);
            setReconnectAttempts(0);
            resolve(sessionId);
          };
          
          websocketRef.current.onmessage = (event) => {
            try {
              // Process incoming messages using the provided handler
              const parsedData = JSON.parse(event.data);
              messageHandler(parsedData);
            } catch (error) {
              console.error('[WebSocketConnection] Error parsing message:', error);
            }
          };
          
          websocketRef.current.onclose = (event) => {
            clearTimeout(connectionTimeout);
            console.log('[WebSocketConnection] Connection closed', event);
            setIsConnected(false);
            setStatus('disconnected');
            
            // Only attempt to reconnect if this wasn't a manual close
            if (event.code !== 1000 && event.code !== 1001) {
              handleReconnection();
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
          };
          
          websocketRef.current.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('[WebSocketConnection] WebSocket error:', error);
            setIsConnected(false);
            setStatus('error');
            setConnectionError('Connection error. Please try again.');
            
            // Reject the promise to trigger reconnect logic
            reject(error);
          };
        });
      };
      
      // Try to connect with timeout
      try {
        await connectWithTimeout();
        return sessionId;
      } catch (error) {
        handleReconnection();
        throw error;
      }
      
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
  
  // Handle reconnection attempts
  const handleReconnection = useCallback(() => {
    // Prevent multiple reconnection attempts
    clearReconnectTimeout();
    
    // Check if we should attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const nextAttempt = reconnectAttempts + 1;
      setReconnectAttempts(nextAttempt);
      
      // Calculate exponential backoff delay
      const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts);
      
      console.log(`[WebSocketConnection] Reconnection attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      toast.info(`Reconnecting... (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`);
      
      // Schedule reconnection attempt
      timeoutRef.current = setTimeout(() => {
        console.log('[WebSocketConnection] Attempting to reconnect...');
        startConnection().catch(error => {
          console.error('[WebSocketConnection] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.log('[WebSocketConnection] Max reconnection attempts reached');
      setStatus('error');
      setConnectionError('Failed to connect after multiple attempts. Please try again later.');
      
      toast.error("Connection failed", {
        description: "Max reconnection attempts reached. Please try again later.",
        duration: 5000
      });
    }
  }, [reconnectAttempts, startConnection]);
  
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
