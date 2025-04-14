
import { useCallback } from 'react';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';

/**
 * Hook for handling voice and transcript events
 */
export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  
  // Directly import the function to avoid circular dependencies
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Handle transcript events
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        chatClientRef.current.saveUserMessage(content);
      });
    }
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent, chatClientRef]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};

// Import this at the end to avoid circular dependencies
import { useTranscriptHandler } from '@/hooks/voice/useTranscriptHandler';
