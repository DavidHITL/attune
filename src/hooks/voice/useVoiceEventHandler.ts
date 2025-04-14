
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
    
    // Enhanced transcript event debugging
    if (event.type && (
        event.type === 'transcript' || 
        event.type.includes('audio_transcript') || 
        event.type.includes('speech')
    )) {
      console.log(`📝 Transcript Event [${event.type}]:`, {
        timestamp: new Date().toISOString(),
        hasTranscript: !!event.transcript,
        hasDelta: !!event.delta,
        eventType: event.type
      });
      
      // Log transcript content if present
      const transcriptText = event.transcript || 
                           (event.delta && event.delta.text) || 
                           (event.transcript && event.transcript.text);
                           
      if (transcriptText) {
        console.log(`📄 Transcript Content [${event.type}]: "${transcriptText.substring(0, 100)}"`);
      }
    }
    
    // Handle transcript events with single save path
    handleTranscriptEvent(event);
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
