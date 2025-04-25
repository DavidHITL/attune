
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
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | null>,
    role: 'user' | 'assistant' = 'user'
  ) => {
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }

    console.log("💾 Processing transcript:", {
      role,
      preview: transcript.substring(0, 50),
      length: transcript.length,
      timestamp: new Date().toISOString()
    });
    
    notifyTranscriptReceived(transcript);

    try {
      // SAVING STRATEGY 1: Try message queue for established conversations
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log(`🔄 Using message queue for ${role} transcript`);
        
        // Queue the message with high priority
        window.attuneMessageQueue.queueMessage(role, transcript, true);
        
        // For user messages: if queue not initialized, force initialization and immediate save
        if (role === 'user' && !window.attuneMessageQueue.isInitialized()) {
          console.log("🔄 First user message - forcing immediate save");
          
          // Try direct save first
          const savedMsg = await saveMessage({
            role,
            content: transcript
          });

          if (savedMsg?.id) {
            console.log("✅ First message saved directly:", savedMsg.id);
            window.attuneMessageQueue.setConversationInitialized();
            notifyTranscriptSaved(savedMsg.id);
          }
        } else if (window.attuneMessageQueue.isInitialized()) {
          // For subsequent messages in initialized conversations, flush queue
          console.log("🔄 Queue is initialized, forcing processing");
          window.attuneMessageQueue.forceFlushQueue().catch(err => {
            console.error("Error flushing queue:", err);
          });
        }
        
        toast.success("Message queued", {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          duration: 2000
        });
        return;
      }
      
      // SAVING STRATEGY 2: Direct save as fallback
      console.log(`💾 Attempting direct message save for ${role} transcript`);
      const savedMsg = await saveMessage({
        role,
        content: transcript
      });
      
      if (savedMsg?.id) {
        console.log(`✅ Successfully saved ${role} transcript with ID:`, savedMsg.id);
        notifyTranscriptSaved(savedMsg.id);
        toast.success("Message saved", {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        });
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
