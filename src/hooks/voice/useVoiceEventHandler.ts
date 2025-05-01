
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { useTranscriptHandler } from './useTranscriptHandler';

export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  const handleVoiceEvent = useCallback((event: any) => {
    console.log(`🎙️ Voice Event Handler - Event Type: ${event.type}`);
    
    // First determine role from EventTypeRegistry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role) {
      console.log(`📝 [useVoiceEventHandler] Event type: ${event.type}, role: ${role}`);
    }
    
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Use our transcript handler to process the event
    // This will now delegate to the specialized handlers via role detection
    handleTranscriptEvent(event);
    
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
