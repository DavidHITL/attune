import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useConversationReady } from '@/hooks/conversation/useConversationReady';
import { TranscriptAccumulator } from '@/utils/chat/transcripts/handlers/TranscriptAccumulator';
import { useAuth } from '@/context/AuthContext';

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
        handleFinalTranscript(finalTranscript, 'user');
      }
    };
  }, []);

  const handleFinalTranscript = useCallback(async (finalTranscript, role: 'user' | 'assistant' = 'user') => {
    if (!finalTranscript || !finalTranscript.trim()) {
      console.log('[TranscriptAggregator] No transcript to save');
      return;
    }
    
    // Prevent duplicate saves
    const transcriptHash = `${role}-${finalTranscript.substring(0, 20)}-${Date.now()}`;
    if (savedMessagesRef.current.has(transcriptHash)) {
      console.log(`[TranscriptAggregator] Already saved this ${role} transcript recently`);
      return;
    }
    
    // Mark as processing
    if (processingRef.current) {
      console.log('[TranscriptAggregator] Already processing a transcript, queuing');
      return;
    }
    processingRef.current = true;
    
    try {
      // First priority: global message queue
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        console.log(`[TranscriptAggregator] Using global message queue for ${role} transcript`);
        window.attuneMessageQueue.queueMessage(role, finalTranscript, true);
        
        // If the queue is initialized, force processing
        if (window.attuneMessageQueue.isInitialized()) {
          window.attuneMessageQueue.forceFlushQueue().catch(err => {
            console.error('Error forcing queue flush:', err);
          });
        } else if (typeof window !== 'undefined' && window.conversationContext?.conversationId) {
          console.log('[TranscriptAggregator] Setting conversation as initialized from transcript aggregator');
          window.attuneMessageQueue.setConversationInitialized();
        }
        
        savedMessagesRef.current.add(transcriptHash);
        toast.success(`${role === 'user' ? 'Message' : 'Response'} queued`, {
          description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
          duration: 2000
        });
      } 
      // Second priority: direct save - REMOVED conversationReady guard
      else {
        console.log(`[TranscriptAggregator] Direct saving ${role} message:`, {
          role,
          contentLength: finalTranscript.length,
          preview: finalTranscript.substring(0, 50)
        });
        
        const savedMessage = await saveMessage({
          role,
          content: finalTranscript,
        });
        
        if (savedMessage) {
          console.log(`[TranscriptAggregator] ${role} message saved successfully:`, {
            messageId: savedMessage.id,
            conversationId: savedMessage.conversation_id
          });
          
          savedMessagesRef.current.add(transcriptHash);
          
          toast.success(role === 'user' ? "Speech transcribed" : "AI response saved", {
            description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
        }
      }

      // Reset accumulator after successful handling
      transcriptAccumulator.reset();
      setAccumulatedTranscript('');
    } catch (error) {
      console.error('[TranscriptAggregator] Failed to save transcript:', error);
      
      // Try global message queue as fallback
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        window.attuneMessageQueue.queueMessage(role, finalTranscript, true);
      }
      
      toast.error("Failed to save transcript", {
        description: error.message || "Database error"
      });
    } finally {
      processingRef.current = false;
    }
  }, [saveMessage, user]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Determine the role based on the event type
    let role: 'user' | 'assistant' = 'user';
    if (event.type === 'response.done' || 
        event.type === 'response.delta' ||
        event.type === 'response.content_part.done') {
      role = 'assistant';
    }

    // CRITICAL FIX: Better handling of various transcript formats
    let transcriptText = '';
    
    // Handle transcript delta events for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      const deltaText = event.delta.text;
      transcriptAccumulator.accumulateText(deltaText);
      setAccumulatedTranscript(transcriptAccumulator.getAccumulatedText());
    }
    
    // Handle interim transcripts
    else if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
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
      console.log('[TranscriptAggregator] Received final transcript event:', event);
      
      // Try multiple ways of extracting the transcript
      if (event.transcript?.text) {
        transcriptText = event.transcript.text;
      } else if (event.delta?.text) {
        transcriptText = event.delta.text;
      } else if (typeof event.transcript === 'string') {
        transcriptText = event.transcript;
      } else {
        // Use accumulated transcript if available
        transcriptText = transcriptAccumulator.getAccumulatedText();
      }
      
      if (transcriptText && transcriptText.trim()) {
        console.log('[TranscriptAggregator] Found final transcript:', transcriptText.substring(0, 50));
        await handleFinalTranscript(transcriptText, role);
      } else {
        console.log('[TranscriptAggregator] No usable transcript found in final event');
      }
    }
    
    // Handle assistant responses
    else if (event.type === 'response.done' && event.response?.content) {
      const assistantContent = event.response.content;
      if (assistantContent && assistantContent.trim()) {
        console.log('[TranscriptAggregator] Found assistant content in response.done:', 
                  assistantContent.substring(0, 50));
        await handleFinalTranscript(assistantContent, 'assistant');
      }
    }
    
    // Handle assistant partial responses
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      const assistantContent = event.content_part.text;
      if (assistantContent && assistantContent.trim()) {
        console.log('[TranscriptAggregator] Found assistant content part:', 
                  assistantContent.substring(0, 50));
        await handleFinalTranscript(assistantContent, 'assistant');
      }
    }
    
    // Also check for response.done event which might contain a transcript
    else if (event.type === 'response.done' && 
             event.response?.output?.[0]?.content?.[0]?.transcript) {
      const transcriptFromResponse = event.response.output[0].content[0].transcript;
      if (transcriptFromResponse && transcriptFromResponse.trim()) {
        console.log('[TranscriptAggregator] Found transcript in response.done:', 
                   transcriptFromResponse.substring(0, 50));
        await handleFinalTranscript(transcriptFromResponse, role);
      }
    }
  }, [handleFinalTranscript]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    saveCurrentTranscript: async (role: 'user' | 'assistant' = 'user') => {
      const transcript = transcriptAccumulator.getAccumulatedText();
      if (transcript && transcript.trim()) {
        console.log(`[TranscriptAggregator] Manually saving current transcript as ${role}:`, transcript.substring(0, 50));
        await handleFinalTranscript(transcript, role);
      }
    }
  };
};
