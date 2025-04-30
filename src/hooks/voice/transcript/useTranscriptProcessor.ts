
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Message } from '@/utils/types';

export const useTranscriptProcessor = (saveMessage: (msg: Partial<Message>) => Promise<Message | null>) => {
  const processingRef = useRef(false);
  const savedMessagesRef = useRef(new Set());

  const processTranscript = useCallback(async (finalTranscript: string, role: 'user' | 'assistant') => {
    if (!finalTranscript || !finalTranscript.trim()) {
      console.log('[TranscriptProcessor] No transcript to save');
      return;
    }
    
    // CRITICAL FIX: Validate role is provided
    if (!role) {
      console.error('[TranscriptProcessor] No role provided for transcript, aborting save');
      return;
    }
    
    const transcriptHash = `${role}-${finalTranscript.substring(0, 20)}-${Date.now()}`;
    if (savedMessagesRef.current.has(transcriptHash)) {
      console.log(`[TranscriptProcessor] Already saved this ${role} transcript recently`);
      return;
    }
    
    if (processingRef.current) {
      console.log('[TranscriptProcessor] Already processing a transcript, queuing');
      return;
    }
    processingRef.current = true;
    
    try {
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log(`[TranscriptProcessor] Using message queue for ${role} transcript`);
        window.attuneMessageQueue.queueMessage(role, finalTranscript, true);
        
        // For user messages: if queue not initialized, force immediate save
        if (role === 'user' && !window.attuneMessageQueue.isInitialized()) {
          console.log('[TranscriptProcessor] First user message - saving directly');
          const savedMessage = await saveMessage({
            role,
            content: finalTranscript
          });
          
          if (savedMessage?.id) {
            console.log('[TranscriptProcessor] First message saved, initializing queue');
            window.attuneMessageQueue.setConversationInitialized();
            savedMessagesRef.current.add(transcriptHash);
          }
        } else if (window.attuneMessageQueue.isInitialized()) {
          window.attuneMessageQueue.forceFlushQueue().catch(err => {
            console.error('Error forcing queue flush:', err);
          });
        }
        
        savedMessagesRef.current.add(transcriptHash);
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued`, {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
        return;
      }
      
      // Direct save as fallback - CRITICAL FIX: Pass role explicitly
      const savedMessage = await saveMessage({
        role,
        content: finalTranscript,
      });
      
      if (savedMessage) {
        console.log(`[TranscriptProcessor] ${role} message saved successfully:`, {
          messageId: savedMessage.id,
          conversationId: savedMessage.conversation_id || savedMessage.id
        });
        
        savedMessagesRef.current.add(transcriptHash);
        
        toast.success(role === 'user' ? "Speech transcribed" : "AI response saved", {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
    } catch (error) {
      console.error('[TranscriptProcessor] Failed to save transcript:', error);
      toast.error("Failed to save transcript", {
        description: error instanceof Error ? error.message : "Database error"
      });
    } finally {
      processingRef.current = false;
    }
  }, [saveMessage]);

  return { processTranscript };
};
