
import { useRef, useCallback, useEffect } from 'react';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useContextStatus } from '@/hooks/voice/useContextStatus';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';

export const useChatClient = () => {
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { saveMessage, messages } = useConversation();
  
  // Use our new custom hooks
  const { voiceActivityState, handleMessageEvent } = useVoiceActivityState();
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    handleSessionCreated, updateMessagesContext
  } = useContextStatus();
  
  // Create a combined message handler
  const combinedMessageHandler = useCallback((event: any) => {
    // Process voice activity state changes
    handleMessageEvent(event);
    
    // Process session creation events
    handleSessionCreated(event);
    
    // Handle transcript events for user messages
    if (event.type === 'transcript' && event.transcript && chatClientRef.current) {
      console.log("Received transcript event, saving user message:", event.transcript);
      
      // Save user message when we get a transcript
      chatClientRef.current.saveUserMessage(event.transcript);
    }
  }, [handleMessageEvent, handleSessionCreated]);
  
  // Initialize connection manager
  const { startConversation, endConversation } = useConnectionManager(
    chatClientRef,
    combinedMessageHandler,
    setStatus,
    saveMessage,
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
  
  // Update context info when messages change
  useEffect(() => {
    updateMessagesContext(messages.length);
  }, [messages, updateMessagesContext]);
  
  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (chatClientRef.current) {
        console.log("Component unmounting - disconnecting chat client");
        chatClientRef.current.disconnect();
      }
    };
  }, []);
  
  // Prevent auto-connecting - only connect when user explicitly requests it
  const handleStartConversation = useCallback(() => {
    if (!isConnected) {
      console.log("User initiated conversation start");
      startConversation();
    }
  }, [isConnected, startConversation]);

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
