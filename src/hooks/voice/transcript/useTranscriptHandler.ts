
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useConversation } from '@/hooks/useConversation';

/**
 * DEPRECATED: This hook has been removed as all event handling is now managed by EventDispatcher
 * Kept as empty implementation for backward compatibility
 */
export const useTranscriptHandler = () => {
  const handleTranscriptEvent = useCallback(() => {
    console.log('[useTranscriptHandler] ❌ DEPRECATED - All events now processed by EventDispatcher');
  }, []);

  return {
    handleTranscriptEvent
  };
};
