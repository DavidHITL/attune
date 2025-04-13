
import { useRef, useCallback, useEffect } from 'react';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useContextStatus } from '@/hooks/voice/useContextStatus';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';
import { toast } from 'sonner';

export const useChatClient = () => {
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { saveMessage, messages, conversationId } = useConversation();
  
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
      
      // Show toast confirmation for debugging
      toast.info("User message received", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      // Save user message when we get a transcript
      chatClientRef.current.saveUserMessage(event.transcript);
      
      // Log key information about conversation state
      console.log("Current conversation ID:", conversationId);
    }
  }, [handleMessageEvent, handleSessionCreated, conversationId]);
  
  // Initialize connection manager with enhanced message tracking
  const { startConversation, endConversation } = useConnectionManager(
    chatClientRef,
    combinedMessageHandler,
    setStatus,
    (message) => {
      // Enhanced debug logging for message saving
      console.log(`Connection manager saving message: ${message.role} - ${message.content?.substring(0, 30)}...`);
      console.log(`Using conversation ID: ${conversationId}`);
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
  
  // Update context info when messages change
  useEffect(() => {
    updateMessagesContext(messages.length);
    
    // Log message count changes for debugging
    console.log(`Messages updated, now ${messages.length} messages in state`);
    const userMessages = messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
    console.log(`Message breakdown: ${userMessages} user, ${assistantMessages} assistant`);
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
