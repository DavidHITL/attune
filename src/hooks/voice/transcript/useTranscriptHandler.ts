
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

    // Check if we have a global context with conversationId
    const hasConversationContext = typeof window !== 'undefined' && 
      window.conversationContext && 
      window.conversationContext.conversationId;
    
    try {
      // SAVING STRATEGY 1: Try message queue first (highest priority)
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log("🔄 Using message queue for transcript");
        window.attuneMessageQueue.queueMessage('user', transcript, true);
        
        // Force queue processing if conversation is initialized
        if (window.attuneMessageQueue.isInitialized()) {
          console.log("🔄 Queue is initialized, forcing processing");
          window.attuneMessageQueue.forceFlushQueue().catch(err => {
            console.error("Error flushing queue:", err);
          });
        } else {
          console.log("⏳ Queue not yet initialized, message will be processed when ready");
          
          // Store conversation ID in global context if available
          if (hasConversationContext && !window.attuneMessageQueue.isInitialized()) {
            console.log("🔄 Setting conversation as initialized from transcript handler");
            window.attuneMessageQueue.setConversationInitialized();
          }
        }
        
        toast.success("Message queued", {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
      
      // SAVING STRATEGY 2: Direct save if context is valid (backup)
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
      } else {
        console.log("⚠️ Conversation context not valid for direct save, relying on queue");
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
