
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
  
  const startConversation = useCallback(async (): Promise<void> => {
    try {
      console.log("Starting conversation, creating chat client...");
      setConnectionError(null);
      
      // First cleanup any existing connection
      if (chatClientRef.current) {
        console.log("Cleaning up previous chat client instance");
        chatClientRef.current.disconnect();
        chatClientRef.current = null;
      }
      
      console.log("Creating new RealtimeChatClient instance");
      
      // Create a wrapper for the message handler to validate event types
      const validatedMessageHandler: MessageCallback = (event) => {
        // Verify event has a type before passing it to handlers
        if (!event || !event.type) {
          console.log("Received event with no type, skipping");
          return;
        }
        
        // Log infrequent events for debugging (skip audio buffer events)
        if (event.type !== 'input_audio_buffer.append') {
          const role = EventTypeRegistry.getRoleForEvent(event.type);
          console.log(`[ConnectionManager] Event: ${event.type}, Role: ${role || 'unknown'}`);
        }
        
        // Pass to the main event handler
        handleMessageEvent(event);
      };
      
      // Create chat client with validated event handlers
      chatClientRef.current = new RealtimeChatClient(
        validatedMessageHandler, 
        setStatus,
        saveMessage
      );
      
      console.log("Initializing chat connection");
      await chatClientRef.current.init();
      
      console.log("Connection initialized successfully");
      setIsConnected(true);
      setIsMicOn(true);
      
      const mode = user ? "authenticated user" : "anonymous user";
      toast.success(`Connected successfully as ${mode}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      setConnectionError(errorMessage);
      
      toast.error("Failed to connect. Please try again.");
      setIsConnected(false);
      setIsMicOn(false);
      throw error; // Re-throw to allow proper error handling
    }
  }, [chatClientRef, handleMessageEvent, saveMessage, setStatus, setIsConnected, setIsMicOn, setConnectionError, user]);

  const endConversation = useCallback(async () => {
    console.log("Ending conversation");
    if (chatClientRef.current) {
      try {
        // Make sure we properly disconnect and clean up resources
        if (typeof chatClientRef.current.flushPendingMessages === 'function') {
          await chatClientRef.current.flushPendingMessages();
        }
        chatClientRef.current.disconnect();
        chatClientRef.current = null;
      } catch (e) {
        console.error("Error during disconnect:", e);
      }
    }
    
    // Reset all states
    setIsConnected(false);
    setVoiceActivityState(0); // Idle state
    setIsMicOn(false);
    setStatus("Disconnected");
    setConnectionError(null);
    
    // Force releasing microphone
    try {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop all tracks to ensure microphone is fully released
          stream.getTracks().forEach(track => {
            track.stop();
          });
        })
        .catch(err => console.error("Error accessing microphone during cleanup:", err));
    } catch (e) {
      console.error("Error during forced microphone cleanup:", e);
    }
  }, [chatClientRef, setIsConnected, setVoiceActivityState, setIsMicOn, setStatus, setConnectionError]);

  return {
    startConversation,
    endConversation
  };
};
