
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

// Create a singleton MessageQueue instance or factory to ensure it's accessible anywhere
let globalMessageQueue: any = null;

// Function to set the global message queue (called from main app initialization)
export const setGlobalMessageQueue = (queue: any) => {
  globalMessageQueue = queue;
};

export const useTranscriptSaver = () => {
  const { validateConversationContext, user } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    role: 'user' | 'assistant',
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    // Force early validation at the entry point
    if (role !== 'user' && role !== 'assistant') {
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }

    // Validate transcript content
    if (!transcript || transcript.trim() === '') {
      return;
    }
    
    notifyTranscriptReceived(transcript);
    
    try {
      // UNIFIED PATH: Check if we have access to the global message queue
      if (globalMessageQueue) {
        // Queue the message with high priority to ensure it gets processed
        globalMessageQueue.queueMessage(role, transcript, true);
        
        // For UI feedback only - actual saving is handled by the queue
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued for saving`, {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          duration: 2000,
        });
        
        // We don't have an immediate ID since the queue will handle saving asynchronously
        notifyTranscriptSaved("queued-" + Date.now());
        
        return {
          id: `temp-${Date.now()}`,
          role: role,
          content: transcript,
          created_at: new Date().toISOString()
        } as Message;
      } else {
        // Add validation of conversation context - now wait for the promise
        const contextValid = await validateConversationContext();
        if (!contextValid) {
          throw new Error("Invalid conversation context");
        }
        
        // Fallback to direct save as a last resort
        const savedMessage = await saveMessage({
          role: role,
          content: transcript
        });
        
        if (savedMessage) {
          notifyTranscriptSaved(savedMessage.id);
        }
        
        return savedMessage;
      }
    } catch (error) {
      notifyTranscriptError(error);
      
      toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
        description: "Please try again",
        duration: 3000,
      });
      
      return undefined;
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError, user]);

  return { saveTranscript };
};
