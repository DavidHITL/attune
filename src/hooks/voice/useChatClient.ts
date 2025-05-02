
import { useRef, useEffect, useCallback, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useVoiceStateManagement } from '@/hooks/voice/useVoiceStateManagement';
import { useVoiceEvents } from '@/hooks/voice/useVoiceEvents';
import { useVoiceChatAnalysis } from '@/hooks/voice/useVoiceChatAnalysis';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Main hook for chat client functionality, refactored for improved event flow and initialization
 */
export const useChatClient = () => {
  // Initialize refs and basic state
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { user } = useAuth();
  const { saveMessage, messages, conversationId } = useConversation();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Set up logging
  useVoiceChatLogger();
  
  // Get state management functions
  const {
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    voiceActivityState,
    setVoiceActivityState,
    hasContext,
    messageCount,
    updateMessagesContext,
    handleSessionCreated
  } = useVoiceStateManagement();

  // Set up background analysis when voice chat sessions end
  useVoiceChatAnalysis(isConnected);

  // Get enhanced voice event handling with unified transcript processing
  const { handleVoiceEvent } = useVoiceEvents(chatClientRef, setVoiceActivityState);
  
  // Combined message handler for all event types
  const combinedMessageHandler = useCallback((event: any) => {
    // Skip events with no type - critical for routing
    if (!event.type) {
      console.log('Skipping event with no type');
      return;
    }
    
    // Process voice events (speech, transcripts)
    handleVoiceEvent(event);
    
    // Process session creation events
    handleSessionCreated(event);
    
    // Log events for debugging with event type classification
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (event.type && event.type !== 'input_audio_buffer.append') {
      console.log(`EVENT [${event.type}] role: ${role || 'unknown'} at ${new Date().toISOString().substring(11, 23)}`);
    }
  }, [handleVoiceEvent, handleSessionCreated]);
  
  // Initialize connection manager with more robust message handling
  const { startConversation, endConversation } = useConnectionManager(
    chatClientRef,
    combinedMessageHandler,
    setStatus,
    async (message) => {
      // Validate message role using EventTypeRegistry as source of truth
      const role = message.role;
      if (role !== 'user' && role !== 'assistant') {
        console.error(`Invalid message role: ${role}, must be 'user' or 'assistant'`);
        return null;
      }
      
      console.log(`Saving message for ${role}: ${message.content?.substring(0, 30)}...`);
      return saveMessage(message);
    },
    setIsConnected,
    (isMicOn: boolean) => setIsMicOn(isMicOn),
    (state: any) => void state,
    setConnectionError
  );
  
  // Initialize microphone controls
  const { 
    isMicOn, setIsMicOn,
    isMuted, setIsMuted,
    toggleMicrophone, toggleMute
  } = useMicrophoneControls(
    chatClientRef,
    isConnected,
    startConversation
  );

  // Direct access to start conversation function with enhanced error handling
  const handleStartConversation = useCallback(async () => {
    console.log("Direct start conversation called");
    setConnectionError(null); // Clear any previous errors
    
    if (!isConnected) {
      try {
        await startConversation();
        console.log("Conversation started successfully");
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setConnectionError(error instanceof Error ? error.message : "Unknown connection error");
        toast.error("Connection failed. Please check your internet and try again.");
      }
    } else {
      console.log("Already connected");
    }
  }, [startConversation, isConnected, setConnectionError]);
  
  // Cleanup effect on unmount with improved reliability
  useEffect(() => {
    return () => {
      console.log("Cleaning up chat client");
      if (chatClientRef.current) {
        // Ensure any pending messages are flushed before disconnecting
        try {
          if (typeof chatClientRef.current.flushPendingMessages === 'function') {
            chatClientRef.current.flushPendingMessages();
            // Give time for messages to be processed before disconnecting
            setTimeout(() => {
              chatClientRef.current?.disconnect();
            }, 300);
          } else {
            console.warn("flushPendingMessages method not available, falling back to direct disconnect");
            chatClientRef.current.disconnect();
          }
        } catch (e) {
          console.error("Error during cleanup:", e);
          chatClientRef.current.disconnect();
        }
      }
    };
  }, []);
  
  // Update context when messages change
  useEffect(() => {
    if (updateMessagesContext && messages) {
      updateMessagesContext(messages.length);
    }
  }, [messages, updateMessagesContext]);
  
  return {
    status,
    isConnected,
    voiceActivityState,
    isMicOn,
    isMuted,
    hasContext,
    messageCount,
    connectionError,
    startConversation: handleStartConversation,
    endConversation,
    toggleMicrophone,
    toggleMute
  };
};
