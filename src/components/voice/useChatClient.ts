
import { useRef, useEffect, useCallback, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';
import { useMessageEventHandler } from '@/hooks/voice/useMessageEventHandler';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

/**
 * Main hook for chat client functionality, refactored for modularity
 */
export const useChatClient = () => {
  // Initialize refs and states first
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { user } = useAuth();
  const { saveMessage, messages, conversationId } = useConversation();
  
  // Set up logging
  useVoiceChatLogger();
  
  // Set up message event handling - initialize in a way that avoids race conditions
  const {
    voiceActivityState,
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    hasContext,
    messageCount,
    updateMessagesContext,
    combinedMessageHandler
  } = useMessageEventHandler(chatClientRef);
  
  // Initialize connection manager with enhanced message tracking
  const { startConversation, endConversation } = useConnectionManager(
    chatClientRef,
    combinedMessageHandler,
    setStatus,
    (message) => {
      // Enhanced debug logging for message saving
      console.log(`Connection manager saving message: ${message.role} - ${message.content?.substring(0, 30)}...`);
      console.log(`Using conversation ID: ${conversationId}`);
      
      if (!user || !conversationId) {
        return Promise.reject(new Error(
          !user ? "User not authenticated" : "No conversation ID"
        ));
      }
      
      return saveMessage(message);
    },
    setIsConnected,
    (isMicOn: boolean) => setIsMicOn(isMicOn),
    (state: VoiceActivityState) => void state
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

  // Direct access to start conversation function
  const handleStartConversation = useCallback(async () => {
    console.log("Direct start conversation called");
    if (!isConnected) {
      try {
        // Call the startConversation from the connection manager directly
        await startConversation();
        console.log("Conversation started successfully");
      } catch (error) {
        console.error("Failed to start conversation:", error);
        toast.error("Connection failed. Please check your internet and try again.");
      }
    } else {
      console.log("Already connected");
    }
  }, [startConversation, isConnected]);
  
  // Handle conversation end
  const handleEndConversation = useCallback(() => {
    console.log("Ending conversation via user action");
    endConversation();
  }, [endConversation]);
  
  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up chat client");
      if (chatClientRef.current) {
        chatClientRef.current.disconnect();
      }
    };
  }, []);
  
  // Update context info when messages change
  useEffect(() => {
    if (updateMessagesContext && messages) {
      updateMessagesContext(messages.length);
      // Log message count changes for debugging
      console.log(`Messages updated, now ${messages.length} messages in state`);
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
    startConversation: handleStartConversation,
    endConversation: handleEndConversation,
    toggleMicrophone,
    toggleMute
  };
};
