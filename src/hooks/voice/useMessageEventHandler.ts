
import { useCallback } from 'react';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useContextStatus } from '@/hooks/voice/useContextStatus';
import { useTranscriptHandler } from '@/hooks/voice/useTranscriptHandler';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';

/**
 * Hook for combining different message event handlers
 */
export const useMessageEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  // Use our custom hooks
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    handleSessionCreated, updateMessagesContext
  } = useContextStatus();

  const { handleTranscriptEvent } = useTranscriptHandler();
  const { logSpeechEvents } = useVoiceChatLogger();
  
  // Create a combined message handler with enhanced transcript handling
  const combinedMessageHandler = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Process session creation events
    handleSessionCreated(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Handle transcript events
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        chatClientRef.current.saveUserMessage(content);
      });
    }
  }, [handleVoiceActivityEvent, handleSessionCreated, logSpeechEvents, handleTranscriptEvent, chatClientRef]);

  return {
    voiceActivityState,
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    hasContext,
    messageCount,
    updateMessagesContext,
    combinedMessageHandler
  };
};
