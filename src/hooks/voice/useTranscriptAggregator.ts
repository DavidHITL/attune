
import { useCallback } from 'react';

/**
 * @deprecated This hook is completely disabled.
 * UserEventHandler is now the only handler for user speech events.
 * 
 * This file is kept only for reference but returns no-op functions.
 */
export const useTranscriptAggregator = () => {
  const handleTranscriptEvent = useCallback(async (event: any) => {
    console.warn('[DEPRECATED TranscriptAggregator] This hook is disabled and no longer processes events.');
    // No-op - all transcript events are now handled by EventDispatcher
  }, []);

  return {
    handleTranscriptEvent,
    currentTranscript: '',
    saveCurrentTranscript: async () => {
      // No-op
      console.warn('[DEPRECATED TranscriptAggregator] This method is disabled.');
    }
  };
};
