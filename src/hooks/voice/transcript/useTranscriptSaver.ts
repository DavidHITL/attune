
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';

export const useTranscriptSaver = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>,
    saveUserMessage?: (content: string) => void
  ) => {
    if (!validateConversationContext()) return;

    notifyTranscriptReceived(transcript);
    
    try {
      console.log("💾 Initiating save via conversation context:", {
        preview: transcript.substring(0, 30),
        timestamp: new Date().toISOString()
      });
      
      const savedMsg = await saveMessage({
        role: 'user',
        content: transcript
      });
      
      notifyTranscriptSaved(savedMsg?.id);

      // Also use the direct save method as a fallback
      if (saveUserMessage) {
        console.log("📎 Using fallback direct save method");
        saveUserMessage(transcript);
      }
    } catch (error) {
      notifyTranscriptError(error);
    }
  }, [validateConversationContext]);

  return { saveTranscript };
};
