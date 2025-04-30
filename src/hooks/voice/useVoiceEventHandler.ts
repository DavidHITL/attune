
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { useTranscriptHandler } from './useTranscriptHandler';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  const handleVoiceEvent = useCallback((event: any) => {
    console.log(`🎙️ Voice Event Handler - Event Type: ${event.type}`);
    
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Enhanced logging for events
    if (event.type) {
      const role = EventTypeRegistry.getRoleForEvent(event.type);
      
      if (role) {
        console.log(`📝 [useVoiceEventHandler] Event type: ${event.type}, determined role: ${role}`);
      }
      
      if (event.type === 'transcript' || event.type.includes('audio_transcript')) {
        logTranscriptDetails(event);
      }
    }
    
    // Use our transcript handler to process the event
    handleTranscriptEvent(event);
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);
  
  function logTranscriptDetails(event: any) {
    // Log raw transcript data for debugging
    if (event.transcript) {
      if (typeof event.transcript === 'string') {
        console.log(`📄 RAW TRANSCRIPT [${event.type}]: "${event.transcript.substring(0, 100)}"`);
      } else if (event.transcript.text) {
        console.log(`📄 RAW TRANSCRIPT [${event.type}]: "${event.transcript.text.substring(0, 100)}"`);
      }
    }
    
    // Log delta content if present
    if (event.delta && event.delta.text) {
      console.log(`📄 DELTA TRANSCRIPT [${event.type}]: "${event.delta.text.substring(0, 100)}"`);
    }
  }

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
