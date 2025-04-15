
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { toast } from 'sonner';

/**
 * Hook for handling voice events and transcripts with enhanced reliability and logging
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  // Get voice activity tracking functions
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  
  // Track transcript accumulation between speech events with improved logging
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
    
    // Handle audio buffer events with better error tracking
    if (event.type === "output_audio_buffer.stopped") {
      console.log("[Audio Buffer] Stopped - Processing pending messages", {
        timestamp: new Date().toISOString(),
        hasClient: !!chatClientRef.current
      });
      
      setTimeout(() => {
        if (chatClientRef.current) {
          console.log("[Audio Buffer] Flushing message queue");
          chatClientRef.current.flushPendingMessages?.();
        }
      }, 500);
    }
  }, [chatClientRef]);
  
  // Enhanced transcript handler that only saves final transcripts with detailed logging
  const handleTranscriptEvent = useCallback((event: any, saveCallback?: (content: string) => void) => {
    // Log intermediate transcripts for debugging without saving
    if (event.type === 'transcript' && event.text) {
      console.log(`[Intermediate Transcript] Received:`, {
        textPreview: event.text.substring(0, 30),
        timestamp: new Date().toISOString(),
        type: 'intermediate'
      });
    }
    
    // Handle final transcript completion with comprehensive logging
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      console.log("[Final Transcript] Processing:", {
        textPreview: finalTranscript.substring(0, 50),
        timestamp: new Date().toISOString(),
        hasCallback: !!saveCallback,
        length: finalTranscript.length
      });
      
      if (saveCallback && finalTranscript.trim() !== '') {
        console.log("[Final Transcript] Initiating save process");
        
        try {
          // Save only final transcript with error handling
          saveCallback(finalTranscript);
          
          // Show success toast
          toast.success("Speech transcribed", { 
            description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
          
          console.log("[Final Transcript] Successfully initiated save");
        } catch (error) {
          console.error("[Final Transcript] Save error:", error);
          toast.error("Failed to save transcript");
        }
      }
    }
  }, []);

  // Combined voice event handler with enhanced logging
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Track transcript accumulation
    transcriptAccumulator(event);
    
    // Enhanced logging for speech events
    if (event.type && (event.type.includes('speech') || event.type.includes('audio'))) {
      console.log(`[Speech Event] Processing:`, {
        type: event.type,
        timestamp: new Date().toISOString(),
        hasTranscript: !!event.transcript,
        hasAudioData: !!event.audio
      });
    }
    
    // Handle transcript events with centralized approach and error tracking
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        console.log("[Save Transcript] Attempting save:", {
          contentPreview: content.substring(0, 30),
          timestamp: new Date().toISOString(),
          hasClient: !!chatClientRef.current?.saveUserMessage
        });
        
        try {
          chatClientRef.current?.saveUserMessage(content);
          console.log("[Save Transcript] Save initiated successfully");
        } catch (error) {
          console.error("[Save Transcript] Error:", error);
          toast.error("Failed to save message");
        }
      });
    }
    
    // Handle audio stopped events with state reset
    if (event.type === 'output_audio_buffer.stopped') {
      console.log("[Voice Event] Audio buffer stopped - resetting state");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, transcriptAccumulator, handleTranscriptEvent, chatClientRef, setVoiceActivityState]);

  return {
    handleVoiceEvent,
    handleTranscriptEvent
  };
};
