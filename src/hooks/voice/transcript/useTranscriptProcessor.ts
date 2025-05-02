
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Message } from '@/utils/types';

export const useTranscriptProcessor = (saveMessage: (msg: Partial<Message>) => Promise<Message | null>) => {
  const processingRef = useRef(false);
  const savedMessagesRef = useRef(new Set());
  const processorId = useRef(`TP-${Date.now().toString(36).substring(-4)}`);
  const messageCounter = useRef({ user: 0, assistant: 0 });

  const processTranscript = useCallback(async (finalTranscript: string, role: 'user' | 'assistant') => {
    // Update counter for this role
    messageCounter.current[role] = (messageCounter.current[role] || 0) + 1;
    const msgCounter = messageCounter.current[role];
    
    if (!finalTranscript || !finalTranscript.trim()) {
      console.log(`[TranscriptProcessor ${processorId.current}] No transcript to save for ${role} #${msgCounter}`);
      return;
    }
    
    // CRITICAL FIX: Validate role is provided and valid
    if (!role || (role !== 'user' && role !== 'assistant')) {
      console.error(`[TranscriptProcessor ${processorId.current}] Invalid or missing role "${role}" for transcript #${msgCounter}, aborting save`);
      return;
    }
    
    const transcriptHash = `${role}-${finalTranscript.substring(0, 20)}-${Date.now()}`;
    if (savedMessagesRef.current.has(transcriptHash)) {
      console.log(`[TranscriptProcessor ${processorId.current}] Already saved this ${role} transcript #${msgCounter} recently (hash: ${transcriptHash.substring(0,15)}...)`);
      return;
    }
    
    if (processingRef.current) {
      console.log(`[TranscriptProcessor ${processorId.current}] Already processing a transcript, queuing ${role} #${msgCounter}`);
      return;
    }
    processingRef.current = true;
    
    try {
      console.log(`[TranscriptProcessor ${processorId.current}] Processing ${role} transcript #${msgCounter}:`, {
        preview: finalTranscript.substring(0, 50) + '...',
        length: finalTranscript.length,
        timestamp: new Date().toISOString()
      });
      
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log(`[TranscriptProcessor ${processorId.current}] Using message queue for ${role} transcript #${msgCounter}`);
        // CRITICAL FIX: Make sure we pass role accurately
        const startTime = performance.now();
        window.attuneMessageQueue.queueMessage(role, finalTranscript, true);
        const endTime = performance.now();
        
        console.log(`[TranscriptProcessor ${processorId.current}] ${role} message #${msgCounter} queued in ${Math.round(endTime - startTime)}ms`);
        
        // For user messages: if queue not initialized, force immediate save
        if (role === 'user' && !window.attuneMessageQueue.isInitialized()) {
          console.log(`[TranscriptProcessor ${processorId.current}] First user message #${msgCounter} - saving directly`);
          const saveStartTime = performance.now();
          const savedMessage = await saveMessage({
            role,
            content: finalTranscript
          });
          const saveEndTime = performance.now();
          
          if (savedMessage?.id) {
            console.log(`[TranscriptProcessor ${processorId.current}] First message #${msgCounter} saved in ${Math.round(saveEndTime - saveStartTime)}ms, initializing queue`);
            window.attuneMessageQueue.setConversationInitialized();
            savedMessagesRef.current.add(transcriptHash);
          } else {
            console.error(`[TranscriptProcessor ${processorId.current}] Failed to save first ${role} message #${msgCounter}`);
          }
        } else if (window.attuneMessageQueue.isInitialized()) {
          console.log(`[TranscriptProcessor ${processorId.current}] Queue initialized, forcing flush for ${role} message #${msgCounter}`);
          const flushStartTime = performance.now();
          
          window.attuneMessageQueue.forceFlushQueue().catch(err => {
            console.error(`[TranscriptProcessor ${processorId.current}] Error forcing queue flush for ${role} #${msgCounter}:`, err);
          });
          
          const flushEndTime = performance.now();
          console.log(`[TranscriptProcessor ${processorId.current}] Queue flush for ${role} #${msgCounter} completed in ${Math.round(flushEndTime - flushStartTime)}ms`);
        }
        
        savedMessagesRef.current.add(transcriptHash);
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued`, {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
        return;
      }
      
      // Direct save as fallback - CRITICAL FIX: Pass role explicitly
      console.log(`[TranscriptProcessor ${processorId.current}] No message queue available, using direct save for ${role} #${msgCounter}`);
      const directSaveStart = performance.now();
      const savedMessage = await saveMessage({
        role,
        content: finalTranscript,
      });
      const directSaveEnd = performance.now();
      
      if (savedMessage) {
        console.log(`[TranscriptProcessor ${processorId.current}] ${role} message #${msgCounter} saved directly in ${Math.round(directSaveEnd - directSaveStart)}ms:`, {
          messageId: savedMessage.id,
          messageRole: role,
          conversationId: savedMessage.conversation_id || savedMessage.id
        });
        
        savedMessagesRef.current.add(transcriptHash);
        
        toast.success(role === 'user' ? "Speech transcribed" : "AI response saved", {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
      } else {
        console.error(`[TranscriptProcessor ${processorId.current}] Failed to save ${role} message #${msgCounter} directly`);
      }
    } catch (error) {
      console.error(`[TranscriptProcessor ${processorId.current}] Failed to save transcript for ${role} #${msgCounter}:`, error);
      toast.error("Failed to save transcript", {
        description: error instanceof Error ? error.message : "Database error"
      });
    } finally {
      processingRef.current = false;
      console.log(`[TranscriptProcessor ${processorId.current}] Processing complete for ${role} #${msgCounter}, unlocking processor`);
    }
  }, [saveMessage, processorId]);

  return { processTranscript };
};

