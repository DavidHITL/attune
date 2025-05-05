
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { CONNECTION_TIMEOUT_MS } from './websocket-config';

/**
 * Creates a WebSocket connection with timeout handling
 */
export const createWebSocketConnection = (
  url: string,
  onOpen: (sessionId: string) => void,
  onMessage: (event: any) => void,
  onClose: (event: CloseEvent) => void,
  onError: (error: Event) => void
): Promise<{ websocket: WebSocket; sessionId: string }> => {
  return new Promise((resolve, reject) => {
    // Generate a unique session ID
    const sessionId = uuidv4();
    console.log(`[WebSocketUtils] Creating connection with session ID: ${sessionId}`);
    
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      reject(new Error('Connection timed out'));
    }, CONNECTION_TIMEOUT_MS);
    
    // Create WebSocket connection
    const websocket = new WebSocket(`${url}?session_id=${sessionId}`);
    
    // Set up WebSocket event listeners
    websocket.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[WebSocketUtils] Connection opened successfully');
      onOpen(sessionId);
      resolve({ websocket, sessionId });
    };
    
    websocket.onmessage = (event) => {
      try {
        // Process incoming messages using the provided handler
        const parsedData = JSON.parse(event.data);
        onMessage(parsedData);
      } catch (error) {
        console.error('[WebSocketUtils] Error parsing message:', error);
      }
    };
    
    websocket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log('[WebSocketUtils] Connection closed', event);
      onClose(event);
    };
    
    websocket.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error('[WebSocketUtils] WebSocket error:', error);
      onError(error);
      reject(error);
    };
  });
};

/**
 * Safely closes a WebSocket connection and cleans up resources
 */
export const cleanupWebSocketConnection = (websocket: WebSocket | null): void => {
  if (websocket) {
    // Remove event listeners to prevent memory leaks
    websocket.onopen = null;
    websocket.onmessage = null;
    websocket.onclose = null;
    websocket.onerror = null;
    
    // Close the connection if it's open
    if (websocket.readyState === WebSocket.OPEN || 
        websocket.readyState === WebSocket.CONNECTING) {
      websocket.close();
    }
  }
};

/**
 * Handles reconnection attempt logic with exponential backoff
 */
export const handleReconnectionAttempt = (
  attempt: number, 
  maxAttempts: number,
  reconnectDelayMs: number,
  onScheduleReconnect: (delay: number) => void
): boolean => {
  // Check if we should attempt to reconnect
  if (attempt >= maxAttempts) {
    console.log('[WebSocketUtils] Max reconnection attempts reached');
    toast.error("Connection failed", {
      description: "Max reconnection attempts reached. Please try again later.",
      duration: 5000
    });
    return false;
  }
  
  // Calculate exponential backoff delay
  const delay = reconnectDelayMs * Math.pow(2, attempt);
  
  console.log(`[WebSocketUtils] Reconnection attempt ${attempt + 1}/${maxAttempts} in ${delay}ms`);
  toast.info(`Reconnecting... (${attempt + 1}/${maxAttempts})`);
  
  // Schedule reconnection attempt
  onScheduleReconnect(delay);
  return true;
};
