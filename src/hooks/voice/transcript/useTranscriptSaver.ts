
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
      console.log("💾 Initiating transcript save:", {
        preview: transcript.substring(0, 30),
        timestamp: new Date().toISOString(),
        hasDirectSaver: !!saveUserMessage
      });
      
      // Important: Try both save methods for redundancy
      
      // Method 1: Use the conversation context save method
      const savedMsg = await saveMessage({
        role: 'user',
        content: transcript
      });
      
      if (savedMsg && savedMsg.id) {
        console.log("✅ Successfully saved transcript via context with ID:", savedMsg.id);
        notifyTranscriptSaved(savedMsg?.id);
      } else {
        console.warn("⚠️ Save via context returned no valid message ID");
        
        // Method 2: Fallback to direct save method if available
        if (saveUserMessage) {
          console.log("📎 Using fallback direct save method");
          saveUserMessage(transcript);
        }
      }
    } catch (error) {
      console.error("❌ Failed to save transcript:", error);
      notifyTranscriptError(error);
      
      // Last resort: Try direct save method if available
      if (saveUserMessage) {
        console.log("🆘 Using direct save method after error");
        try {
          saveUserMessage(transcript);
        } catch (directError) {
          console.error("❌ Direct save method also failed:", directError);
        }
      }
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
