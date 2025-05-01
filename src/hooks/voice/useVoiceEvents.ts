
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * @deprecated This hook is deprecated in favor of useVoiceEventHandler
 * which uses the EventDispatcher system for more robust event handling.
 * 
 * Kept for reference only - this hook is no longer used by the application.
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  const { handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  
  const handleVoiceEvent = useCallback((event: any) => {
    console.warn(`[DEPRECATED useVoiceEvents] This hook should not be used anymore. Use useVoiceEventHandler instead.`);
    
    // Process voice activity state changes only
    handleVoiceActivityEvent(event);
    
    // Handle audio buffer stopped events
    if (event.type === 'output_audio_buffer.stopped') {
      console.log("[Voice Event] Audio buffer stopped - resetting state");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, [handleVoiceActivityEvent, setVoiceActivityState]);

  return {
    handleVoiceEvent
  };
};
