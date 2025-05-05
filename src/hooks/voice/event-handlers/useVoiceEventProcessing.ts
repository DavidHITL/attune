
import { useCallback } from 'react';
import { useTranscriptHandler } from '@/hooks/voice/useTranscriptHandler';

/**
 * Hook for processing voice-specific events
 */
export const useVoiceEventProcessing = () => {
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  /**
   * Filter and process voice-specific events
   */
  const processVoiceEvent = useCallback((event: any) => {
    // Skip any events that need special handling by system components
    if (event.type === 'input_audio_buffer.append' || 
        event.type === 'input_audio_activity_started' ||
        event.type === 'input_audio_activity_stopped') {
      return;
    }
    
    // Extract transcript content for specific event types
    if (event.type === 'transcript' || 
        event.type === 'response.audio_transcript.done' ||
        event.type === 'conversation.item.input_audio_transcription.completed') {
      
      handleTranscriptEvent(event);
    }
  }, [handleTranscriptEvent]);

  return {
    processVoiceEvent
  };
};
