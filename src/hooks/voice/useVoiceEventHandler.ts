
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
    
    // Track all transcript-related events for debugging
    if (event.type && (
        event.type === 'transcript' || 
        event.type.includes('audio_transcript') || 
        event.type.includes('speech')
    )) {
      console.log(`TRANSCRIPT EVENT: ${event.type}`, event);
      
      // If this is a transcript event with text content, log it
      const transcriptText = event.transcript || 
                             (event.delta && event.delta.text) || 
                             (event.transcript && event.transcript.text);
                             
      if (transcriptText) {
        console.log(`📄 TRANSCRIPT TEXT: "${transcriptText.substring(0, 100)}"`);
      }
    }
    
    // Handle transcript events with direct database saving
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        console.log(`💾 Saving transcript via chatClientRef: "${content.substring(0, 50)}..."`);
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
