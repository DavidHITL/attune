
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
      const deltaText = event.delta.text;
      setAccumulatedTranscript(prev => {
        const newText = prev + deltaText;
        console.log(`[TranscriptAggregator] Delta received, new text (${newText.length} chars): "${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`);
        return newText;
      });
    }
    
    // Handle interim transcripts (these are complete transcripts that come in)
    else if (event.type === 'transcript' && event.transcript && event.transcript.trim()) {
      const newTranscript = event.transcript;
      console.log(`[TranscriptAggregator] Full transcript received (${newTranscript.length} chars): "${newTranscript}"`);
      
      setAccumulatedTranscript(prev => {
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

    // Handle final transcript and save accumulated text
    else if (event.type === 'response.audio_transcript.done') {
      console.log(`[TranscriptAggregator] Final transcript event received, accumulated text: ${accumulatedTranscript.length} chars`);
      
      if (!accumulatedTranscript || !accumulatedTranscript.trim()) {
        console.log('[TranscriptAggregator] No accumulated transcript to save');
        return;
      }

      try {
        console.log(`[TranscriptAggregator] Saving transcript: "${accumulatedTranscript.substring(0, 50)}..."`);
        
        const savedMessage = await saveMessage({
          role: 'user',
          content: accumulatedTranscript,
        });
        
        if (savedMessage) {
          toast.success("Speech transcribed", {
            description: accumulatedTranscript.substring(0, 50) + (accumulatedTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
          console.log('[TranscriptAggregator] Transcript saved successfully:', savedMessage);
        } else {
          console.log('[TranscriptAggregator] Anonymous mode - transcript processed locally');
          toast.success("Speech processed", {
            description: accumulatedTranscript.substring(0, 50) + (accumulatedTranscript.length > 50 ? "..." : ""),
            duration: 2000
          });
        }
        
        // Reset accumulator after successful processing
        setAccumulatedTranscript('');
      } catch (error) {
        console.error('[TranscriptAggregator] Failed to save transcript:', error);
        toast.error("Failed to save transcript");
      }
    }
  }, [accumulatedTranscript, saveMessage]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript
  };
};
