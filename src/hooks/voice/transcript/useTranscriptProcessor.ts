
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
    
    // Validate role is correct before proceeding
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptProcessor] Invalid role: ${role}, must be 'user' or 'assistant'`);
      role = 'user'; // Default to user as fallback if invalid
    }
    
    // CRITICAL FIX: Log role for debugging throughout the entire system
    console.log(`[TranscriptProcessor] CONFIRMED ROLE: ${role} before passing to saveTranscript`);
    
    // Delegate to the saveTranscript function, passing the explicit role
    await saveTranscript(transcript, role, saveMessage);
  }, [saveTranscript, saveMessage]);

  return { processTranscript };
};
