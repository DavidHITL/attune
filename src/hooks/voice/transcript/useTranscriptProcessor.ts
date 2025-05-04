
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';

export const useTranscriptProcessor = (
  saveMessage: (message: Partial<Message>) => Promise<Message | undefined>
) => {
  const processTranscript = useCallback(async (
    transcript: string,
    role: 'user' | 'assistant'
  ) => {
    // Critical: Strict role validation at entry point
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[useTranscriptProcessor] Invalid role: ${role}. Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    if (!transcript || transcript.trim() === '') {
      console.log('[useTranscriptProcessor] Empty transcript, skipping save');
      return;
    }
    
    console.log(`[useTranscriptProcessor] Processing ${role} transcript: "${transcript.substring(0, 30)}..."}`);
    
    // Get the centralized message queue - unified path
    const messageQueue = getMessageQueue();
    
    if (messageQueue) {
      // Use the unified queue path for all messages
      console.log(`[useTranscriptProcessor] Routing ${role} message through queue`);
      messageQueue.queueMessage(role, transcript, true);
    } else {
      // Fallback to direct save if no queue
      await messageSaveService.saveMessageToDatabase({
        role, 
        content: transcript
      });
    }
  }, []);

  return { processTranscript };
};
