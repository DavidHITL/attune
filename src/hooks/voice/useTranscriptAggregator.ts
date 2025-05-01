
import { useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useTranscriptProcessor } from './transcript/useTranscriptProcessor';
import { useTranscriptAccumulator } from './transcript/useTranscriptAccumulator';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';

export const useTranscriptAggregator = () => {
  const componentName = 'useTranscriptAggregator';
  const instanceId = useRef(`${componentName}-${Date.now()}`).current;
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
        console.log(`[${componentName}:${instanceId}] 🧹 Saving final transcript on cleanup:`, finalTranscript.substring(0, 50));
        // Explicitly use 'user' role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
    };
  }, [getAccumulatedText, processTranscript, instanceId]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // SINGLE SOURCE OF TRUTH: Always use EventTypeRegistry for role determination
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    
    // Skip events with no role mapping
    if (!role) {
      console.log(`[${componentName}:${instanceId}] ⏭️ Skipping event with no role mapping: ${event.type}`);
      return;
    }
    
    // Log role determined by EventTypeRegistry for tracing
    console.log(`[${componentName}:${instanceId}] 🔍 Processing ${event.type} with role from EventTypeRegistry: ${role}`);
    let transcriptContent: string | null = null;
    
    // Extract content based on event type
    if (event.type === 'response.done' && event.response?.content) {
      transcriptContent = event.response.content;
      console.log(`[${componentName}:${instanceId}] 🤖 Assistant response content: ${transcriptContent.substring(0, 50)}`);
    } 
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      transcriptContent = event.content_part.text;
      console.log(`[${componentName}:${instanceId}] 🤖 Assistant content part: ${transcriptContent.substring(0, 50)}`);
    }
    else if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log(`[${componentName}:${instanceId}] 👤 User transcript: ${transcriptContent.substring(0, 50)}`);
      
      // Accumulate text for interim transcripts from user
      accumulateText(event.transcript);
    }
    else if (event.type === 'response.audio_transcript.done') {
      transcriptContent = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
      
      if (transcriptContent && transcriptContent.trim()) {
        console.log(`[${componentName}:${instanceId}] 📝 Final user transcript (${role}): ${transcriptContent.substring(0, 50)}`);
        
        // CRITICAL FIX: Double check and log the role we're passing to process
        console.log(`[${componentName}:${instanceId}] 🔍 Saving transcript with VERIFIED role: ${role}`);
        
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
        
      // CRITICAL FIX: Double check and log the role we're passing
      console.log(`[${componentName}:${instanceId}] 🔍 Saving assistant response with VERIFIED role: ${role}`);
      
      console.log(`[${componentName}:${instanceId}] 💾 Saving assistant response with role ${role}: ${transcriptContent.substring(0, 50)}`);
      await processTranscript(transcriptContent, role);
      
      // Show toast for assistant response
      toast.success("AI response received", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator, componentName, instanceId]);

  return {
    handleTranscriptEvent,
    currentTranscript: accumulatedTranscript,
    saveCurrentTranscript: async (role: 'user' | 'assistant') => {
      if (!role) {
        console.error(`[${componentName}:${instanceId}] ❌ No role provided to saveCurrentTranscript`);
        return;
      }
      
      // CRITICAL FIX: Verify and log the explicit role we're using
      console.log(`[${componentName}:${instanceId}] 🔍 Saving current transcript with EXPLICIT role: ${role}`);
      
      const transcript = getAccumulatedText();
      if (transcript && transcript.trim()) {
        console.log(`[${componentName}:${instanceId}] 💾 Saving current transcript with explicit role: ${role}`);
        console.log(`[${componentName}:${instanceId}] 📝 Content preview: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};
