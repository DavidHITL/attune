
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';

export const useTranscriptSaver = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    if (!validateConversationContext()) {
      console.warn("⚠️ Cannot save transcript: Invalid conversation context");
      return;
    }

    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }

    notifyTranscriptReceived(transcript);
    
    try {
      console.log("💾 Saving transcript:", {
        preview: transcript.substring(0, 30),
        timestamp: new Date().toISOString()
      });
      
      const savedMsg = await saveMessage({
        role: 'user',
        content: transcript
      });
      
      if (savedMsg && savedMsg.id) {
        console.log("✅ Successfully saved transcript with ID:", savedMsg.id);
        notifyTranscriptSaved(savedMsg?.id);
      } else {
        console.warn("⚠️ Save returned no valid message ID");
      }
    } catch (error) {
      console.error("❌ Failed to save transcript:", error);
      notifyTranscriptError(error);
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
