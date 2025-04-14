
import { useRef, useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';
import { useMessageEventHandler } from '@/hooks/voice/useMessageEventHandler';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';
import { useConversationControls } from '@/hooks/voice/useConversationControls';
import { useAuth } from '@/context/AuthContext';

/**
 * Main hook for chat client functionality, refactored for modularity
 */
export const useChatClient = () => {
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { user } = useAuth();
  const { saveMessage, messages, conversationId } = useConversation();
  
  // Set up logging
  useVoiceChatLogger();
  
  // Set up message event handling
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
  
  // Set up conversation controls
  const { handleStartConversation, cleanupChatClient } = useConversationControls(
    chatClientRef,
    isConnected,
    startConversation
  );
  
  // Update context info when messages change
  useEffect(() => {
    updateMessagesContext(messages.length);
    
    // Log message count changes for debugging
    console.log(`Messages updated, now ${messages.length} messages in state`);
  }, [messages, updateMessagesContext]);
  
  // Cleanup effect on unmount
  useEffect(() => {
    return cleanupChatClient;
  }, [cleanupChatClient]);
  
  return {
    status,
    isConnected,
    voiceActivityState,
    isMicOn,
    isMuted,
    hasContext,
    messageCount,
    startConversation: handleStartConversation,
    endConversation,
    toggleMicrophone,
    toggleMute
  };
};
