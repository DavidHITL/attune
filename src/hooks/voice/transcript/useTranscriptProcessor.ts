
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
    // CRITICAL FIX #1: Force validation of role to one of the only two allowed values
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptProcessor] CRITICAL ERROR: Invalid role: ${role}`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // CRITICAL FIX #2: Log with redundant role information for debugging
    console.log(`[TranscriptProcessor] Processing transcript with EXPLICIT ROLE: "${role}"`, {
      roleAsString: role,
      contentPreview: transcript.substring(0, 50),
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL FIX #3: Delegate to the saveTranscript function, passing the hardcoded, validated role
    await saveTranscript(transcript, role, saveMessage);
  }, [saveTranscript, saveMessage]);

  return { processTranscript };
};
