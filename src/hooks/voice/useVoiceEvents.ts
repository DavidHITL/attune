
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * Hook for handling voice events with focus only on voice activity UI state
 * No longer handles transcript aggregation (now handled by EventDispatcher)
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Only process voice activity state changes - removed transcript aggregation
    handleVoiceActivityEvent(event);
    
    // Determine role from event type for logging purposes only
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role) {
      console.log(`[useVoiceEvents] Event type: ${event.type}, using role: ${role}`);
    }
    
    // Log transcript details for debugging
    if (event.type === 'transcript' || event.type.includes('audio_transcript')) {
      logTranscriptDetails(event);
    }
    
    // Handle audio buffer stopped events
    if (event.type === 'output_audio_buffer.stopped') {
      console.log("[Voice Event] Audio buffer stopped - resetting state");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, setVoiceActivityState]);

  function logTranscriptDetails(event: any) {
    // Log raw transcript data for debugging purposes only
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
    handleVoiceEvent
  };
};
