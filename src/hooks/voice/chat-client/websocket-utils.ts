
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { CONNECTION_TIMEOUT_MS, WS_URL } from './websocket-config';
import { WebRTCConnection } from '../../../utils/audio/WebRTCConnection';

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
    console.log(`[WebSocketUtils] Creating WebRTC connection with session ID: ${sessionId}`);
    
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      reject(new Error('Connection timed out'));
    }, CONNECTION_TIMEOUT_MS);
    
    // Create a mock WebSocket that actually uses WebRTC
    const webrtcConnection = new WebRTCConnection();
    
    // Initialize the WebRTC connection
    webrtcConnection.init(onMessage)
      .then(() => {
        clearTimeout(connectionTimeout);
        console.log('[WebSocketUtils] WebRTC connection established successfully');
        
        // Create a mock WebSocket object that wraps the WebRTC connection
        const mockWebSocket = {
          send: (data: string) => {
            try {
              // The WebRTC connection expects JSON parsed objects
              const jsonData = JSON.parse(data);
              const peerConnectionHandler = webrtcConnection['peerConnectionHandler'];
              
              // If this is a data channel and it's open, send the data
              if (peerConnectionHandler && peerConnectionHandler['dc']) {
                peerConnectionHandler['dc'].send(data);
              } else {
                console.warn('[WebSocketUtils] Data channel not ready or not available');
              }
            } catch (error) {
              console.error('[WebSocketUtils] Error sending data:', error);
            }
          },
          close: () => {
            webrtcConnection.disconnect();
          },
          readyState: WebSocket.OPEN,
        } as unknown as WebSocket;
        
        // Call the open handler
        onOpen(sessionId);
        
        // Resolve with the mock websocket and session ID
        resolve({ websocket: mockWebSocket, sessionId });
      })
      .catch((error) => {
        clearTimeout(connectionTimeout);
        console.error('[WebSocketUtils] WebRTC connection error:', error);
        onError(error as Event);
        reject(error);
      });
  });
};

/**
 * Safely closes a WebSocket connection and cleans up resources
 */
export const cleanupWebSocketConnection = (websocket: WebSocket | null): void => {
  if (websocket) {
    // Check if this is our mock WebSocket with the close method
    if (websocket.close) {
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
