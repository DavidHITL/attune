
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';

/**
 * Hook for handling voice events and transcripts
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  // Get voice activity tracking functions
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  
  // Handle transcript events
  const handleTranscriptEvent = useCallback((event: any, saveCallback?: (content: string) => void) => {
    // Check for transcript events
    if (event.type === 'transcript' && event.text) {
      console.log(`Transcript received: ${event.text.substring(0, 30)}...`);
      if (saveCallback) {
        saveCallback(event.text);
      }
    }
  }, []);

  // Combined voice event handler
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech events for debugging
    if (event.type && event.type.includes('speech')) {
      console.log(`Speech event: ${event.type}`);
    }
    
    // Handle transcript events
    if (chatClientRef.current) {
      handleTranscriptEvent(event, (content) => {
        chatClientRef.current?.saveUserMessage(content);
      });
    }
  }, [handleVoiceActivityEvent, handleTranscriptEvent, chatClientRef]);

  return {
    handleVoiceEvent,
    handleTranscriptEvent
  };
};
