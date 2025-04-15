
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    // CRITICAL FIX: Validate transcript content first
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }

    // Log full transcript for debugging
    console.log("💾 Processing transcript:", {
      preview: transcript.substring(0, 50),
      length: transcript.length,
      timestamp: new Date().toISOString()
    });
    
    notifyTranscriptReceived(transcript);
    
    try {
      // CRITICAL FIX: Try queue first, then direct save if context is valid
      if (window.attuneMessageQueue) {
        console.log("🔄 Using message queue for transcript");
        window.attuneMessageQueue.queueMessage('user', transcript, true);
        
        // CRITICAL FIX: Force queue processing after short delay
        setTimeout(() => {
          if (window.attuneMessageQueue?.isInitialized()) {
            console.log("🔄 Forcing queue processing after delay");
            // This will process any queued messages if the conversation is ready
            window.attuneMessageQueue.setConversationInitialized();
          }
        }, 1000);
      }
      
      // If context is valid, also try direct save
      if (validateConversationContext()) {
        console.log("💾 Context valid, attempting direct save");
        const savedMsg = await saveMessage({
          role: 'user',
          content: transcript
        });
        
        if (savedMsg?.id) {
          console.log("✅ Successfully saved transcript with ID:", savedMsg.id);
          notifyTranscriptSaved(savedMsg.id);
          toast.success("Message saved", {
            description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          });
        }
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
