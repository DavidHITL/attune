
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '../useConversation';

export const useTranscriptAggregator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const { saveMessage } = useConversation();

  const handleTranscriptEvent = useCallback((event: any) => {
    // Handle interim transcripts (accumulate but don't save)
    if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      setAccumulatedTranscript(prev => {
        const newTranscript = event.transcript;
        console.log(`Accumulating transcript: "${newTranscript.substring(0, 50)}..."`);
        
        // Only update if it's different from previous
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

    // Handle final transcript (save and reset)
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      const finalTranscript = event.transcript.text;
      console.log(`Processing final transcript: "${finalTranscript.substring(0, 50)}..."`);

      // Save message using accumulated or final transcript
      const messageContent = accumulatedTranscript || finalTranscript;
      if (messageContent.trim()) {
        console.log('Saving final transcript');
        saveMessage({
          role: 'user',
          content: messageContent
        }).then(() => {
          toast.success("Speech transcribed", {
            description: messageContent.substring(0, 50) + (messageContent.length > 50 ? "..." : ""),
            duration: 2000
          });
        }).catch(error => {
          console.error('Failed to save transcript:', error);
          toast.error("Failed to save transcript");
        });

        // Reset accumulator
        setAccumulatedTranscript('');
      }
    }
  }, [accumulatedTranscript, saveMessage]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript
  };
};
