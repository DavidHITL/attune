
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useTranscriptAggregator } from './useTranscriptAggregator';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { handleTranscriptEvent } = useTranscriptAggregator();
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Determine role from event type before handling
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role) {
      console.log(`[useVoiceEvents] Event type: ${event.type}, using role: ${role}`);
    }
    
    // Handle transcript events with unified handler
    handleTranscriptEvent(event);
    
    // Handle audio buffer stopped events
    if (event.type === 'output_audio_buffer.stopped') {
      console.log("[Voice Event] Audio buffer stopped - resetting state");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, handleTranscriptEvent, setVoiceActivityState]);

  return {
    handleVoiceEvent
  };
};
