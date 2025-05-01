
import { useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';

/**
 * @deprecated This hook is deprecated and completely disabled.
 * All voice events should use useVoiceEventHandler with the EventDispatcher system.
 * 
 * This file is kept only for reference but returns a no-op handler.
 */
export const useVoiceEvents = (
  chatClientRef: React.MutableRefObject<any>,
  setVoiceActivityState: (state: VoiceActivityState) => void
) => {
  const handleVoiceEvent = useCallback((event: any) => {
    console.warn(`[DEPRECATED useVoiceEvents] This hook is disabled and should not be used anymore.`);
    // No-op - all events should be handled by useVoiceEventHandler
  }, []);

  return {
    handleVoiceEvent
  };
};
