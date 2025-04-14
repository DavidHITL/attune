
import { useCallback } from 'react';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useVoiceChatLogger } from '@/hooks/voice/useVoiceChatLogger';
import { useTranscriptHandler } from './useTranscriptHandler';

/**
 * Hook for handling voice and transcript events with enhanced debugging
 */
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
    
    // Enhanced message saving debug logging
    if (chatClientRef.current) {
      console.log('💾 Processing transcript via chatClientRef');
      
      // Pass direct save function to ensure transcript gets saved
      handleTranscriptEvent(event, (content) => {
        if (content && content.trim()) {
          console.log(`💾 Directly saving user message: "${content.substring(0, 50)}..."`);
          chatClientRef.current.saveUserMessage(content);
        } else {
          console.log(`⚠️ Empty content, not saving user message`);
        }
      });
    } else {
      console.warn('⚠️ chatClientRef not available for saving transcript');
    }
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent, chatClientRef]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
