
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { useTranscriptHandler } from './useTranscriptHandler';

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
    
    // Enhanced transcript event debugging with explicit content logging
    if (event.type && (
        event.type === 'transcript' || 
        event.type.includes('audio_transcript') || 
        event.type.includes('speech')
    )) {
      console.log(`📝 TRANSCRIPT EVENT [${event.type}]:`, {
        timestamp: new Date().toISOString(),
        hasTranscript: !!event.transcript,
        hasDelta: !!event.delta,
        hasText: !!(event.transcript && event.transcript.text),
        eventType: event.type
      });
      
      // CRITICAL FIX: Log raw transcript data for debugging
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
    
    // Special handling for final transcript events
    if (event.type === 'response.audio_transcript.done') {
      console.log("FINAL TRANSCRIPT EVENT RECEIVED:", {
        _type: typeof event.transcript,
        value: JSON.stringify(event.transcript)
      });
      
      if (event.transcript && event.transcript.text) {
        console.log("FINAL TRANSCRIPT TEXT:", event.transcript.text);
      }
    }
    
    // Handle transcript events with dedicated handler
    handleTranscriptEvent(event);
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
