
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { useTranscriptSaver } from './useTranscriptSaver';

export const useTranscriptProcessor = (
  saveMessage: (message: Partial<Message>) => Promise<Message | undefined>
) => {
  const { saveTranscript } = useTranscriptSaver();
  
  const processTranscript = useCallback(async (
    transcript: string,
    role: 'user' | 'assistant' = 'user' // Default to user for backward compatibility
  ) => {
    console.log(`[TranscriptProcessor] Processing ${role} transcript: ${transcript.substring(0, 30)}...`);
    
    // Delegate to the saveTranscript function, passing the role
    await saveTranscript(transcript, role, saveMessage);
  }, [saveTranscript, saveMessage]);

  return { processTranscript };
};
