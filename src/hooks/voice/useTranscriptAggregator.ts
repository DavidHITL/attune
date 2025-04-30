
import { useCallback, useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useTranscriptProcessor } from './transcript/useTranscriptProcessor';
import { useTranscriptAccumulator } from './transcript/useTranscriptAccumulator';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';

export const useTranscriptAggregator = () => {
  const { saveMessage } = useConversation();
  const { processTranscript } = useTranscriptProcessor(saveMessage);
  const { 
    accumulatedTranscript, 
    accumulateText, 
    getAccumulatedText, 
    reset: resetAccumulator 
  } = useTranscriptAccumulator();
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      const finalTranscript = getAccumulatedText();
      if (finalTranscript && finalTranscript.trim()) {
        console.log('[TranscriptAggregator] Saving final transcript on cleanup:', finalTranscript.substring(0, 50));
        // Always explicitly set role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // SINGLE SOURCE OF TRUTH: Always use EventTypeRegistry for role determination
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    
    // Skip events with no role mapping
    if (!role) {
      console.log(`[TranscriptAggregator] Skipping event with no role mapping: ${event.type}`);
      return;
    }
    
    console.log(`[TranscriptAggregator] Processing ${event.type} with role: ${role}`);
    let transcriptContent: string | null = null;
    
    // Extract content based on event type
    if (event.type === 'response.done' && event.response?.content) {
      transcriptContent = event.response.content;
      console.log(`[TranscriptAggregator] Assistant response content: ${transcriptContent.substring(0, 50)}`);
    } 
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      transcriptContent = event.content_part.text;
      console.log(`[TranscriptAggregator] Assistant content part: ${transcriptContent.substring(0, 50)}`);
    }
    else if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log(`[TranscriptAggregator] User transcript: ${transcriptContent.substring(0, 50)}`);
      
      // Accumulate text for interim transcripts from user
      accumulateText(event.transcript);
    }
    else if (event.type === 'response.audio_transcript.done') {
      transcriptContent = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      
      if (transcriptContent && transcriptContent.trim()) {
        console.log(`[TranscriptAggregator] Final user transcript: ${transcriptContent.substring(0, 50)}`);
        await processTranscript(transcriptContent, role);
        resetAccumulator();
        
        // Show toast to confirm transcript saved
        toast.success("Speech captured", {
          description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
          duration: 3000
        });
      }
    }
    
    // Handle audio transcript delta events (always user)
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      accumulateText(event.delta.text);
    }
    
    // Process final assistant responses
    if ((event.type === 'response.done' || event.type === 'response.content_part.done') && 
        role === 'assistant' && transcriptContent && transcriptContent.trim()) {
      console.log(`[TranscriptAggregator] Processing assistant response with role ${role}: ${transcriptContent.substring(0, 50)}`);
      await processTranscript(transcriptContent, role);
      
      // Show toast for assistant response
      toast.success("AI response received", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    saveCurrentTranscript: async (role: 'user' | 'assistant') => {
      if (!role) {
        console.error('[TranscriptAggregator] No role provided to saveCurrentTranscript');
        return;
      }
      
      const transcript = getAccumulatedText();
      if (transcript && transcript.trim()) {
        console.log(`[TranscriptAggregator] Saving current transcript with role: ${role}`);
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};
