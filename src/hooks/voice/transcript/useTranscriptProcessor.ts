
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { useTranscriptSaver } from './useTranscriptSaver';

export const useTranscriptProcessor = (
  saveMessage: (message: Partial<Message>) => Promise<Message | undefined>
) => {
  const { saveTranscript } = useTranscriptSaver();
  
  const processTranscript = useCallback(async (
    transcript: string,
    role: 'user' | 'assistant'
  ) => {
    // Force validation of role to one of the only two allowed values
    if (role !== 'user' && role !== 'assistant') {
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // Delegate to the saveTranscript function, passing the hardcoded, validated role
    await saveTranscript(transcript, role, saveMessage);
  }, [saveTranscript, saveMessage]);

  return { processTranscript };
};
