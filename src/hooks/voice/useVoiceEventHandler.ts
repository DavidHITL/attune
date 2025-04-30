
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { useTranscriptHandler } from './useTranscriptHandler';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Only handle UI state updates, not message processing
    console.log(`🎙️ [useVoiceEventHandler] UI state updates only for: ${event.type}`);
    
    // Voice call UI state updates only
    handleVoiceActivityEvent(event);
    
    // Log speech events for debugging
    logSpeechEvents(event);
    
    // No transcript processing here - all handled by EventDispatcher
  }, [handleVoiceActivityEvent, logSpeechEvents]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
