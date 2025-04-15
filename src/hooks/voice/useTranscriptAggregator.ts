
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useConversationReady } from '@/hooks/conversation/useConversationReady';

export const useTranscriptAggregator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const { saveMessage, conversationId } = useConversation();
  const { waitForConversation } = useConversationReady(conversationId);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Handle interim transcripts
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      setAccumulatedTranscript(prev => {
        const newTranscript = event.transcript;
        console.log(`Accumulating transcript: "${newTranscript.substring(0, 50)}..."`);
        
        // Only update and show toast if different from previous
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
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      console.log(`Processing final transcript: "${finalTranscript.substring(0, 50)}..."`);

      // Wait for conversation to be initialized
      const isConversationReady = await waitForConversation();
      if (!isConversationReady) {
        console.error('Failed to save message: Conversation not initialized');
        toast.error("Failed to save transcript: Please try again");
        setAccumulatedTranscript('');
        return;
      }

      // Save message using accumulated or final transcript
      const messageContent = accumulatedTranscript || finalTranscript;
      if (messageContent.trim()) {
        console.log('Saving final transcript');
        try {
          await saveMessage({
            role: 'user',
            content: messageContent
          });
          
          toast.success("Speech transcribed", {
            description: messageContent.substring(0, 50) + (messageContent.length > 50 ? "..." : ""),
            duration: 2000
          });
        } catch (error) {
          console.error('Failed to save transcript:', error);
          toast.error("Failed to save transcript");
        }

        // Reset accumulator
        setAccumulatedTranscript('');
      }
    }
  }, [accumulatedTranscript, saveMessage, waitForConversation]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript
  };
};
