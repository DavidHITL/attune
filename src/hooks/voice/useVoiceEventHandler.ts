
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { useVoiceEventProcessing } from './event-handlers/useVoiceEventProcessing';

export const useVoiceEventHandler = () => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  const { processVoiceEvent } = useVoiceEventProcessing();
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Use our specialized processor for voice events
    processVoiceEvent(event);
  }, [handleVoiceActivityEvent, logSpeechEvents, processVoiceEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
