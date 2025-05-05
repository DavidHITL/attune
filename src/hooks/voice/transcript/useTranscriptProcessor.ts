
import { useCallback } from 'react';
import { Message } from '@/utils/types';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';
import { toast } from 'sonner';

export const useTranscriptProcessor = (
  saveMessage: (message: Partial<Message>) => Promise<Message | undefined>
) => {
  const processTranscript = useCallback(async (
    transcript: string,
    role: 'user' | 'assistant'
  ) => {
    // Critical: Strict role validation at entry point
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptProcessor] Invalid role: ${role}. Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    if (!transcript || transcript.trim() === '') {
      console.log('[TranscriptProcessor] Empty transcript, skipping');
      return;
    }
    
    // Trim and clean the transcript
    const cleanedTranscript = transcript.trim();
    
    // Show toast notification
    toast.success(`Processing ${role} transcript`, { 
      description: cleanedTranscript.substring(0, 50) + (cleanedTranscript.length > 50 ? "..." : ""),
      duration: 2000
    });
    
    // Get the centralized message queue - unified path
    const messageQueue = getMessageQueue();
    
    try {
      if (messageQueue) {
        console.log(`[TranscriptProcessor] Using message queue to save ${role} transcript: "${cleanedTranscript.substring(0, 50)}${cleanedTranscript.length > 50 ? '...' : ''}"`);
        // Use the unified queue path with high priority for transcripts
        messageQueue.queueMessage(role, cleanedTranscript, true);
      } else {
        console.log(`[TranscriptProcessor] No message queue available, using direct save for ${role} transcript`);
        // Fall back to direct save if no queue
        await messageSaveService.saveMessageToDatabase({
          role, 
          content: cleanedTranscript
        });
      }
    } catch (error) {
      console.error('[TranscriptProcessor] Error saving transcript:', error);
      
      // Show error toast
      toast.error('Error saving transcript', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 3000
      });
      
      // Attempt one more direct save as fallback
      try {
        console.log('[TranscriptProcessor] Attempting direct save fallback');
        await saveMessage({
          role,
          content: cleanedTranscript
        });
      } catch (fallbackError) {
        console.error('[TranscriptProcessor] Fallback save failed:', fallbackError);
      }
    }
  }, [saveMessage]);

  return { processTranscript };
};
