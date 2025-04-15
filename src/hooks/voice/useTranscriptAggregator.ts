
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useConversation } from '@/hooks/useConversation';
import { useConversationReady } from '@/hooks/conversation/useConversationReady';
import { TranscriptAccumulator } from '@/utils/chat/transcripts/handlers/TranscriptAccumulator';

export const useTranscriptAggregator = () => {
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const { saveMessage, conversationId } = useConversation();
  const { waitForConversation } = useConversationReady(conversationId);
  const transcriptAccumulator = new TranscriptAccumulator();

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
      const finalTranscript = transcriptAccumulator.getAccumulatedText();
      
      if (!finalTranscript || !finalTranscript.trim()) {
        console.log('[TranscriptAggregator] No transcript to save');
        return;
      }

      try {
        await waitForConversation();
        
        const savedMessage = await saveMessage({
          role: 'user',
          content: finalTranscript,
        });
        
        if (savedMessage) {
          toast.success("Speech transcribed", {
            description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
        } else {
          console.log('[TranscriptAggregator] Anonymous mode - transcript processed locally');
          toast.success("Speech processed", {
            description: finalTranscript.substring(0, 50) + (finalTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
        }
        
        // Reset accumulator after successful save
        transcriptAccumulator.reset();
        setAccumulatedTranscript('');
      } catch (error) {
        console.error('[TranscriptAggregator] Failed to save transcript:', error);
        toast.error("Failed to save transcript");
      }
    }
  }, [saveMessage, waitForConversation]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript
  };
};
