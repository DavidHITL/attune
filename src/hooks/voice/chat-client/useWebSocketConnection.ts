
import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Define the WebSocket URL
const WS_URL = process.env.NEXT_PUBLIC_ATTUNE_WEBSOCKET_URL || 'ws://localhost:8080';

/**
 * Hook for managing WebSocket connection to the voice chat server
 */
export const useWebSocketConnection = (messageHandler: (event: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  
  // Ref to hold the WebSocket instance
  const websocketRef = useRef<WebSocket | null>(null);
  
  // Cleanup function to properly close the connection
  const closeConnection = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  // Function to start a new WebSocket connection
  const startConnection = useCallback(async () => {
    if (websocketRef.current || isConnected) {
      console.log("Already connected or connecting");
      return;
    }
    
    // Optimistic UI update
    setIsConnected(false);
    setStatus('connecting');
    setConnectionError(null);
    
    try {
      // Generate a unique session ID
      const sessionId = uuidv4();
      
      // Create a new WebSocket connection
      websocketRef.current = new WebSocket(`${WS_URL}?session_id=${sessionId}`);
      
      // Set up WebSocket event listeners
      websocketRef.current.onopen = async () => {
        console.log('WebSocket connection opened');
        setIsConnected(true);
        setStatus('connected');
        setConnectionError(null);
      };
      
      websocketRef.current.onmessage = (event) => {
        // Process incoming messages using the provided handler
        messageHandler(JSON.parse(event.data));
      };
      
      websocketRef.current.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        setIsConnected(false);
        setStatus('disconnected');
        websocketRef.current = null;
        
        // Show toast notification
        toast.error("Disconnected from voice server", {
          description: "Please check your internet connection and try again.",
          duration: 3000
        });
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setStatus('error');
        setConnectionError('Failed to connect to the server. Please try again.');
        websocketRef.current = null;
        
        // Show toast notification
        toast.error("Connection error", {
          description: "Please check your internet connection and try again.",
          duration: 3000
        });
      };
      
      return sessionId;
    } catch (error) {
      console.error('Failed to start connection:', error);
      setIsConnected(false);
      setStatus('error');
      setConnectionError('Failed to start connection. Please try again.');
      
      // Show toast notification
      toast.error("Failed to connect", {
        description: "Please try again.",
        duration: 3000
      });
      
      throw error;
    }
  }, [isConnected, messageHandler]);
  
  // Clean up WebSocket on component unmount
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
