
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

export const useTranscriptProcessor = (
  saveMessage: (message: Partial<Message>) => Promise<Message | undefined>
) => {
  const processTranscript = useCallback(async (
    transcript: string,
    role: 'user' | 'assistant'
  ) => {
    // Critical: Strict role validation at entry point
    if (role !== 'user' && role !== 'assistant') {
      console.error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    if (!transcript || transcript.trim() === '') {
      console.log('Empty transcript, skipping save');
      return;
    }
    
    console.log(`Processing ${role} transcript: "${transcript.substring(0, 30)}..."}`);
    
    // Use the centralized message save service - single save path
    await messageSaveService.saveMessageToDatabase({
      role, 
      content: transcript
    });
  }, []);

  return { processTranscript };
};
