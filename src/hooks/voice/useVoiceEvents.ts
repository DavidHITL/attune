
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useTranscriptAggregator } from './useTranscriptAggregator';

export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { handleTranscriptEvent } = useTranscriptAggregator();
  
  const transcriptAccumulator = useCallback((event: any) => {
    // Handle audio transcript delta events for accumulation only
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      console.log(`[Transcript Delta] Processing: "${event.delta.text}"`, {
        timestamp: new Date().toISOString(),
        eventType: event.type
      });
      
      if (chatClientRef.current) {
        chatClientRef.current.accumulateTranscript?.(event.delta.text);
      }
    }
    
    // Handle audio buffer events
    if (event.type === "output_audio_buffer.stopped") {
      console.log("[Audio Buffer] Stopped - Processing pending messages");
      
      setTimeout(() => {
        if (chatClientRef.current) {
          console.log("[Audio Buffer] Flushing message queue");
          chatClientRef.current.flushPendingMessages?.();
        }
      }, 500);
    }
  }, [chatClientRef]);

  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Track transcript accumulation
    transcriptAccumulator(event);
    
    // Handle transcript events with new aggregator
    handleTranscriptEvent(event);
    
    // Handle audio stopped events with state reset
    if (event.type === 'output_audio_buffer.stopped') {
      console.log("[Voice Event] Audio buffer stopped - resetting state");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, transcriptAccumulator, handleTranscriptEvent, setVoiceActivityState]);

  return {
    handleVoiceEvent
  };
};
