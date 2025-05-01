
import { useCallback } from 'react';

/**
 * @deprecated This hook is completely disabled.
 * All transcript events should be handled by EventDispatcher with UserEventHandler.
 * 
 * This file is kept only for reference but returns a no-op handler.
 */
export const useTranscriptHandler = () => {
  const handleTranscriptEvent = useCallback((event: any) => {
    console.warn('⚠️ [DEPRECATED useTranscriptHandler] This hook is disabled and no longer processes events.');
    // No-op - all transcript events are now handled by EventDispatcher
  }, []);

  return {
    handleTranscriptEvent
  };
};
