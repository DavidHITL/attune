
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { toast } from 'sonner';

/**
 * Hook for handling voice events and transcripts with enhanced reliability
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  // Get voice activity tracking functions
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  
  // Track transcript accumulation between speech events
  const transcriptAccumulator = useCallback((event: any) => {
    // Handle audio transcript delta events
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      console.log(`Transcript delta received: "${event.delta.text}"`);
      if (chatClientRef.current) {
        chatClientRef.current.accumulateTranscript?.(event.delta.text);
      }
    }
    
    // Handle audio buffer events - ensure we save any pending transcript
    if (event.type === "output_audio_buffer.stopped") {
      console.log("Audio output buffer stopped - ensuring transcript is complete");
      setTimeout(() => {
        if (chatClientRef.current) {
          chatClientRef.current.flushPendingMessages?.();
        }
      }, 500);
    }
  }, [chatClientRef]);
  
  // Enhanced transcript handler with centralized message queue approach
  const handleTranscriptEvent = useCallback((event: any, saveCallback?: (content: string) => void) => {
    // Removed intermediate transcript saving
    if (event.type === 'transcript' && event.text) {
      console.log(`Direct transcript received: ${event.text.substring(0, 30)}...`);
      // Log only - no saving or toast for intermediate transcripts
    }
    
    // Handle final transcript completion (highest reliability)
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      console.log("Final audio transcript received:", finalTranscript.substring(0, 50));
      
      if (saveCallback) {
        // Save final transcript with high priority
        saveCallback(finalTranscript);
        
        // Show toast for final transcript
        toast.success("Speech transcribed", { 
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
    }
  }, []);

  // Combined voice event handler
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Track transcript accumulation
    transcriptAccumulator(event);
    
    // Log speech events for debugging
    if (event.type && (event.type.includes('speech') || event.type.includes('audio'))) {
      console.log(`Speech/audio event: ${event.type}`);
    }
    
    // Handle transcript events with centralized approach
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        // This is the critical path for user messages - ensure high priority
        console.log(`Saving user transcript with centralized handler: ${content.substring(0, 30)}...`);
        chatClientRef.current?.saveUserMessage(content);
      });
    }
    
    // Handle audio stopped events to ensure complete messages
    if (event.type === 'output_audio_buffer.stopped') {
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, transcriptAccumulator, handleTranscriptEvent, chatClientRef, setVoiceActivityState]);

  return {
    handleVoiceEvent,
    handleTranscriptEvent
  };
};
