
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';

export const useTranscriptSaver = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    // CRITICAL FIX: Add explicit validation at the start
    if (!validateConversationContext()) {
      console.error("❌ Cannot save transcript: Invalid conversation context");
      return;
    }

    // CRITICAL FIX: Validate transcript content
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }

    // Log full transcript for debugging
    console.log("💾 FULL TRANSCRIPT TO SAVE:", transcript);
    
    notifyTranscriptReceived(transcript);
    
    try {
      console.log("💾 Saving transcript:", {
        preview: transcript.substring(0, 30),
        length: transcript.length,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL FIX: Add retry logic for transcript saving
      let attempt = 1;
      const maxAttempts = 3;
      let savedMsg: Message | undefined;
      
      while (attempt <= maxAttempts && !savedMsg?.id) {
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt} for saving transcript`);
        }
        
        try {
          savedMsg = await saveMessage({
            role: 'user',
            content: transcript
          });
          
          if (savedMsg && savedMsg.id) {
            console.log("✅ Successfully saved transcript with ID:", savedMsg.id);
            break;
          } else {
            console.warn(`⚠️ Save attempt ${attempt} returned no valid message ID`);
            attempt++;
          }
        } catch (innerError) {
          console.error(`❌ Attempt ${attempt} failed:`, innerError);
          attempt++;
          if (attempt <= maxAttempts) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (savedMsg && savedMsg.id) {
        notifyTranscriptSaved(savedMsg?.id);
        toast.success("Message saved", {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        });
      } else {
        throw new Error(`Failed to save transcript after ${maxAttempts} attempts`);
      }
    } catch (error) {
      console.error("❌ Failed to save transcript:", error);
      notifyTranscriptError(error);
      toast.error("Failed to save message", {
        description: "Please try speaking again",
      });
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
