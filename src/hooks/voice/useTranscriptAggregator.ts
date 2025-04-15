import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useConversationReady } from '@/hooks/conversation/useConversationReady';
import { TranscriptAccumulator } from '@/utils/chat/transcripts/handlers/TranscriptAccumulator';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/utils/types';

export const useTranscriptAggregator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const { saveMessage, conversationId } = useConversation();
  const { waitForConversation } = useConversationReady(conversationId);
  const transcriptAccumulator = new TranscriptAccumulator();
  const { user } = useAuth();
  
  // Add a ref to track if we've already handled a final transcript
  const processingRef = useRef(false);
  const savedMessagesRef = useRef(new Set());

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Check if there's accumulated text to save when unmounting
      const finalTranscript = transcriptAccumulator.getAccumulatedText();
      if (finalTranscript && finalTranscript.trim()) {
        console.log('[TranscriptAggregator] Saving final transcript on cleanup:', finalTranscript.substring(0, 50));
        handleFinalTranscript(finalTranscript);
      }
    };
  }, []);

  const handleFinalTranscript = useCallback(async (finalTranscript) => {
    if (!finalTranscript || !finalTranscript.trim()) {
      console.log('[TranscriptAggregator] No transcript to save');
      return;
    }
    
    // Prevent duplicate saves
    const transcriptHash = `${finalTranscript.substring(0, 20)}-${Date.now()}`;
    if (savedMessagesRef.current.has(transcriptHash)) {
      console.log('[TranscriptAggregator] Already saved this transcript recently');
      return;
    }
    
    // Mark as processing
    if (processingRef.current) {
      console.log('[TranscriptAggregator] Already processing a transcript, queuing');
      return;
    }
    processingRef.current = true;
    
    try {
      console.log('[TranscriptAggregator] Waiting for conversation before saving...');
      
      await waitForConversation();
      
      console.log('[TranscriptAggregator] Saving message:', {
        role: 'user',
        contentLength: finalTranscript.length,
        conversationId,
        preview: finalTranscript.substring(0, 50)
      });
      
      // CRITICAL FIX: Try message queue first
      if (window.attuneMessageQueue) {
        window.attuneMessageQueue.queueMessage('user', finalTranscript, true);
      }
      
      const savedMessage = await saveMessage({
        role: 'user',
        content: finalTranscript,
      });
      
      if (savedMessage) {
        console.log('[TranscriptAggregator] Message saved successfully:', {
          messageId: savedMessage.id,
          conversationId
        });
        
        savedMessagesRef.current.add(transcriptHash);
        
        toast.success("Speech transcribed", {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
      
      // Reset accumulator after successful save
      transcriptAccumulator.reset();
      setAccumulatedTranscript('');
    } catch (error) {
      console.error('[TranscriptAggregator] Failed to save transcript:', error);
      // CRITICAL FIX: Try message queue as fallback
      if (window.attuneMessageQueue) {
        window.attuneMessageQueue.queueMessage('user', finalTranscript, true);
      }
      toast.error("Failed to save transcript", {
        description: error.message || "Database error"
      });
    } finally {
      processingRef.current = false;
    }
  }, [saveMessage, waitForConversation, conversationId]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Handle transcript delta events for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      const deltaText = event.delta.text;
      transcriptAccumulator.accumulateText(deltaText);
      setAccumulatedTranscript(transcriptAccumulator.getAccumulatedText());
    }
    
    // Handle interim transcripts
    else if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      const newTranscript = event.transcript;
      transcriptAccumulator.setTranscript(newTranscript);
      setAccumulatedTranscript(newTranscript);
      
      toast.info("Speech detected", {
        description: newTranscript.substring(0, 50) + (newTranscript.length > 50 ? "..." : ""),
        duration: 2000
      });
    }

    // Handle final transcript and save message
    else if (event.type === 'response.audio_transcript.done') {
      console.log('[TranscriptAggregator] Received final transcript event');
      const finalTranscript = transcriptAccumulator.getAccumulatedText();
      await handleFinalTranscript(finalTranscript);
    }
  }, [handleFinalTranscript]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    saveCurrentTranscript: async () => {
      const transcript = transcriptAccumulator.getAccumulatedText();
      if (transcript && transcript.trim()) {
        console.log('[TranscriptAggregator] Manually saving current transcript:', transcript.substring(0, 50));
        await handleFinalTranscript(transcript);
      }
    }
  };
};
