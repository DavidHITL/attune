
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';
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
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }

    // Validate transcript content
    if (!transcript || transcript.trim() === '') {
      return;
    }
    
    notifyTranscriptReceived(transcript);
    
    try {
      // Use centralized message save service - single save path
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
