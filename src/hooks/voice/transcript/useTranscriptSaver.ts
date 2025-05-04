
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

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
      throw new Error(`[useTranscriptSaver] Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }

    // Validate transcript content
    if (!transcript || transcript.trim() === '') {
      return;
    }
    
    notifyTranscriptReceived(transcript);
    
    try {
      // Get the centralized message queue - unified path
      const messageQueue = getMessageQueue();
      
      if (messageQueue) {
        // Use the unified queue path for all messages
        console.log(`[useTranscriptSaver] Routing ${role} message through queue`);
        messageQueue.queueMessage(role, transcript, true);
        
        // Simulate successful save for notification purposes
        notifyTranscriptSaved(`temp-${Date.now()}`);
        
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued`, {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
          duration: 2000,
        });
        
        // Return a temporary message object for UI purposes
        return {
          id: `temp-${Date.now()}`,
          role,
          content: transcript,
          created_at: new Date().toISOString()
        } as Message;
      } else {
        // Fallback to direct save if no queue
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role: role,
          content: transcript
        });
        
        if (savedMessage) {
          notifyTranscriptSaved(savedMessage.id);
          
          toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
            description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
            duration: 2000,
          });
        }
        
        return savedMessage as Message;
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
