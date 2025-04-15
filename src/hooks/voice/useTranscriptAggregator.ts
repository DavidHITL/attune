
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useConversationReady } from '@/hooks/conversation/useConversationReady';

export const useTranscriptAggregator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const { saveMessage, conversationId } = useConversation();
  const { waitForConversation } = useConversationReady(conversationId);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Handle transcript delta events for accumulation
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      setAccumulatedTranscript(prev => {
        const newText = prev + event.delta.text;
        console.log(`Accumulating delta transcript: "${newText.substring(0, 50)}..."`);
        return newText;
      });
    }
    
    // Handle interim transcripts
    else if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      setAccumulatedTranscript(prev => {
        const newTranscript = event.transcript;
        if (prev !== newTranscript) {
          toast.info("Speech detected", {
            description: newTranscript.substring(0, 50) + (newTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
          return newTranscript;
        }
        return prev;
      });
    }

    // Handle final transcript
    else if (event.type === 'response.audio_transcript.done') {
      if (!accumulatedTranscript.trim()) {
        console.log('No accumulated transcript to save');
        return;
      }

      console.log(`Processing final transcript: "${accumulatedTranscript.substring(0, 50)}..."`);

      try {
        // For authenticated users, wait for conversation to be initialized
        const isConversationReady = await waitForConversation();
        
        if (!isConversationReady) {
          console.warn('Conversation not ready, but proceeding with message save');
        }
        
        // Save the accumulated transcript
        const savedMessage = await saveMessage({
          role: 'user',
          content: accumulatedTranscript,
        });
        
        if (savedMessage) {
          toast.success("Speech transcribed", {
            description: accumulatedTranscript.substring(0, 50) + (accumulatedTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
          console.log('Transcript saved successfully:', savedMessage);
        } else {
          console.warn('Transcript could not be saved (likely anonymous mode)');
          toast.success("Speech processed", {
            description: accumulatedTranscript.substring(0, 50) + (accumulatedTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
        }
        
        // Reset accumulator after successful save
        setAccumulatedTranscript('');
      } catch (error) {
        console.error('Failed to save transcript:', error);
        toast.error("Failed to save transcript");
      }
    }
  }, [accumulatedTranscript, saveMessage, waitForConversation]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript
  };
};
