
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('[useTranscriptHandler] DISABLED - Event handling now fully managed by EventDispatcher');
    console.log(`[useTranscriptHandler] Skipping secondary processing for event: ${event.type}`);
    
    // All events are now processed by EventDispatcher, no duplicate processing needed
    return;
  }, []);

  return {
    handleTranscriptEvent
  };
};
