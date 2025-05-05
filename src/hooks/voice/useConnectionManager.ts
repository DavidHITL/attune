import { useCallback } from 'react';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { MessageCallback, StatusCallback, SaveMessageCallback } from '@/utils/types';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Hook for managing connection to the voice chat service with improved event flow
 */
export const useConnectionManager = (
  chatClientRef: React.MutableRefObject<RealtimeChatClient | null>,
  handleMessageEvent: MessageCallback,
  setStatus: StatusCallback,
  saveMessage: SaveMessageCallback,
  setIsConnected: (isConnected: boolean) => void,
  setIsMicOn: (isMicOn: boolean) => void,
  setVoiceActivityState: (state: any) => void,
  setConnectionError: (error: string | null) => void
) => {
  const { user } = useAuth();
  const connectionId = Math.random().toString(36).substring(2, 9);
  
  // Use test mode in development for safer testing
  const useTestMode = process.env.NODE_ENV === 'development';
  
  const startConversation = useCallback(async (): Promise<void> => {
    try {
      console.log(`[ConnectionManager ${connectionId}] Starting conversation, creating chat client...`);
      setConnectionError(null);
      
      // First cleanup any existing connection
      if (chatClientRef.current) {
        console.log(`[ConnectionManager ${connectionId}] Cleaning up previous chat client instance`);
        chatClientRef.current.disconnect();
        chatClientRef.current = null;
      }
      
      console.log(`[ConnectionManager ${connectionId}] Creating new RealtimeChatClient instance with testMode: ${useTestMode}`);
      
      // Create a wrapper for the message handler to validate event types
      const validatedMessageHandler: MessageCallback = (event) => {
        // Verify event has a type before passing it to handlers
        if (!event || !event.type) {
          console.log(`[ConnectionManager ${connectionId}] Received event with no type, skipping`);
          return;
        }
        
        // Log infrequent events for debugging (skip audio buffer events)
        if (event.type !== 'input_audio_buffer.append') {
          const role = EventTypeRegistry.getRoleForEvent(event.type);
          console.log(`[ConnectionManager ${connectionId}] Event: ${event.type}, Role: ${role || 'unknown'}, timestamp: ${new Date().toISOString()}`);
        }
        
        // Pass to the main event handler
        handleMessageEvent(event);
      };
      
      // Create chat client with validated event handlers and test mode
      chatClientRef.current = new RealtimeChatClient(
        validatedMessageHandler, 
        setStatus,
        saveMessage,
        useTestMode
      );
      
      console.log(`[ConnectionManager ${connectionId}] Initializing chat connection`);
      const startTime = performance.now();
      await chatClientRef.current.init();
      const endTime = performance.now();
      
      console.log(`[ConnectionManager ${connectionId}] Connection initialized successfully in ${Math.round(endTime - startTime)}ms`);
      setIsConnected(true);
      setIsMicOn(true);
      
      const mode = user ? "authenticated user" : "anonymous user";
      toast.success(`Connected successfully as ${mode}`);
    } catch (error) {
      console.error(`[ConnectionManager ${connectionId}] Failed to start conversation:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      setConnectionError(errorMessage);
      
      toast.error("Failed to connect. Please try again.");
      setIsConnected(false);
      setIsMicOn(false);
      throw error; // Re-throw to allow proper error handling
    }
  }, [chatClientRef, handleMessageEvent, saveMessage, setStatus, setIsConnected, setIsMicOn, setConnectionError, user, connectionId, useTestMode]);

  const endConversation = useCallback(async () => {
    console.log(`[ConnectionManager ${connectionId}] Ending conversation`);
    if (chatClientRef.current) {
      try {
        // Make sure we properly disconnect and clean up resources
        console.log(`[ConnectionManager ${connectionId}] Flushing pending messages...`);
        if (typeof chatClientRef.current.flushPendingMessages === 'function') {
          await chatClientRef.current.flushPendingMessages();
          console.log(`[ConnectionManager ${connectionId}] Messages flushed, now disconnecting...`);
          // Give time for messages to be processed before disconnecting
          setTimeout(() => {
            if (chatClientRef.current) {
              console.log(`[ConnectionManager ${connectionId}] Disconnecting...`);
              chatClientRef.current.disconnect();
              chatClientRef.current = null;
              console.log(`[ConnectionManager ${connectionId}] Disconnected`);
            }
          }, 300);
        } else {
          console.warn(`[ConnectionManager ${connectionId}] flushPendingMessages method not available, falling back to direct disconnect`);
          chatClientRef.current.disconnect();
          chatClientRef.current = null;
        }
      } catch (e) {
        console.error(`[ConnectionManager ${connectionId}] Error during disconnect:`, e);
        if (chatClientRef.current) {
          chatClientRef.current.disconnect();
          chatClientRef.current = null;
        }
      }
    } else {
      console.log(`[ConnectionManager ${connectionId}] No chat client to disconnect`);
    }
    
    // Reset all states
    setIsConnected(false);
    setVoiceActivityState(0); // Idle state
    setIsMicOn(false);
    setStatus("Disconnected");
    setConnectionError(null);
    
    // Force releasing microphone
    try {
      console.log(`[ConnectionManager ${connectionId}] Force releasing microphone...`);
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop all tracks to ensure microphone is fully released
          stream.getTracks().forEach(track => {
            console.log(`[ConnectionManager ${connectionId}] Stopping track:`, track.kind, track.label);
            track.stop();
          });
          console.log(`[ConnectionManager ${connectionId}] All microphone tracks stopped`);
        })
        .catch(err => console.error(`[ConnectionManager ${connectionId}] Error accessing microphone during cleanup:`, err));
    } catch (e) {
      console.error(`[ConnectionManager ${connectionId}] Error during forced microphone cleanup:`, e);
    }
  }, [chatClientRef, setIsConnected, setVoiceActivityState, setIsMicOn, setStatus, setConnectionError, connectionId]);

  return {
    startConversation,
    endConversation
  };
};
