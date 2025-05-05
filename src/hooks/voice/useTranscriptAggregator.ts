
import { useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useTranscriptProcessor } from './transcript/useTranscriptProcessor';
import { useTranscriptAccumulator } from './transcript/useTranscriptAccumulator';
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
  
  // Track if we're currently in a speech segment
  const activeSpeechRef = useRef(false);
  // Track the last time we received a transcript
  const lastTranscriptTimeRef = useRef(Date.now());
  // Track if we have a pending finalization timer
  const finalizationTimerRef = useRef<number | null>(null);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      const finalTranscript = getAccumulatedText();
      if (finalTranscript && finalTranscript.trim()) {
        console.log('[TranscriptAggregator] Saving final transcript on cleanup:', finalTranscript.substring(0, 50));
        // Always explicitly set role for cleanup saving
        processTranscript(finalTranscript, 'user');
      }
      
      // Clear any pending timers
      if (finalizationTimerRef.current) {
        clearTimeout(finalizationTimerRef.current);
      }
    };
  }, [getAccumulatedText, processTranscript]);
  
  // Function to finalize the current transcript
  const finalizeCurrentTranscript = useCallback(() => {
    // Reset the timer reference
    finalizationTimerRef.current = null;
    
    // Get and process the accumulated text
    const transcript = getAccumulatedText();
    if (transcript && transcript.trim()) {
      console.log(`[TranscriptAggregator] Finalizing transcript: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
      
      // Show toast notification
      toast.success("Speech transcribed", {
        description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        duration: 2000
      });
      
      // Process with explicit user role
      processTranscript(transcript, 'user');
      
      // Reset after processing
      resetAccumulator();
      activeSpeechRef.current = false;
    }
  }, [getAccumulatedText, processTranscript, resetAccumulator]);

  const handleTranscriptEvent = useCallback(async (event: any) => {
    // Update the last transcript time
    lastTranscriptTimeRef.current = Date.now();
    
    // CRITICAL FIX: Always determine message role before processing
    // Default to null (require explicit role assignment)
    let role: 'user' | 'assistant' | null = null;
    let transcriptContent: string | null = null;
    let isSpeechStart = false;
    let isSpeechEnd = false;
    
    // IMPORTANT DEBUG LOGGING - Log the incoming event type and explicit role
    console.log(`🔍 [TranscriptAggregator] Processing event type: ${event.type}, explicitRole: ${event.explicitRole || 'none'}`);
    
    // First check if the event has an explicitly assigned role from EventDispatcher
    if (event.explicitRole === 'assistant' || event.explicitRole === 'user') {
      role = event.explicitRole;
      console.log(`[TranscriptAggregator] Using explicit role from event: ${role}`);
    }
    // If no explicit role, determine based on event type
    else {
      // Determine role and content based on event type
      if (event.type === 'response.done' || 
          event.type.includes('response.content_part') ||
          (event.type === 'response.delta' && !event.type.includes('audio'))) {
        role = 'assistant';
      }
      // User speech events
      else if (event.type === 'transcript' || 
               event.type.includes('audio_transcript')) {
        role = 'user';
      }
      
      console.log(`[TranscriptAggregator] Determined role from event type: ${role || 'undefined'}`);
    }
    
    // Check for speech start/end events
    if (event.type === 'input_audio_activity_started') {
      isSpeechStart = true;
      activeSpeechRef.current = true;
      
      // Clear any pending finalization timer
      if (finalizationTimerRef.current) {
        clearTimeout(finalizationTimerRef.current);
        finalizationTimerRef.current = null;
        console.log('[TranscriptAggregator] Cleared pending finalization timer due to speech start');
      }
    }
    else if (event.type === 'input_audio_activity_stopped') {
      isSpeechEnd = true;
      
      // Set timer to finalize transcript after a short delay
      // This allows any pending transcript deltas to arrive
      if (!finalizationTimerRef.current && activeSpeechRef.current) {
        console.log('[TranscriptAggregator] Setting finalization timer after speech end');
        finalizationTimerRef.current = setTimeout(() => {
          finalizeCurrentTranscript();
        }, 800) as unknown as number;
      }
    }
    
    // CRITICAL CHECK: If we still don't have a role, log and skip processing
    if (!role && !isSpeechStart && !isSpeechEnd) {
      console.log(`[TranscriptAggregator] ⚠️ Cannot process event with unknown role: ${event.type}`);
      return;
    }
    
    // Now extract content based on role and event type
    // Assistant responses
    if (role === 'assistant') {
      // Extract content from assistant responses
      if (event.type === 'response.done' && event.response?.content) {
        transcriptContent = event.response.content;
      } 
      else if (event.type === 'response.content_part.done' && event.content_part?.text) {
        transcriptContent = event.content_part.text;
      }
      
      if (transcriptContent) {
        console.log(`[TranscriptAggregator] Assistant content: ${transcriptContent.substring(0, 50)}`);
      }
    }
    // User speech events
    else if (role === 'user') {
      // Extract content from user transcripts
      if (event.type === 'transcript' && typeof event.transcript === 'string' && event.transcript.trim()) {
        transcriptContent = event.transcript;
        accumulateText(transcriptContent); // Accumulate interim transcripts
      }
      else if (event.type === 'response.audio_transcript.done') {
        transcriptContent = event.transcript?.text || event.delta?.text || 
                          (typeof event.transcript === 'string' ? event.transcript : getAccumulatedText());
        
        // Handle final transcript - process immediately
        if (transcriptContent && transcriptContent.trim()) {
          console.log(`🔒 [TranscriptAggregator] Final transcript received: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`);
          
          // Clear any pending finalization timer
          if (finalizationTimerRef.current) {
            clearTimeout(finalizationTimerRef.current);
            finalizationTimerRef.current = null;
          }
          
          // Process with explicit user role
          await processTranscript(transcriptContent, 'user');
          resetAccumulator();
          activeSpeechRef.current = false;
        }
      }
    }
    
    // Handle transcript delta events for accumulation (always user)
    if (event.type === 'response.audio_transcript.delta' && event.delta?.text) {
      const deltaText = event.delta.text;
      accumulateText(deltaText);
      
      // If we have a finalization timer pending, clear and reset it
      // This ensures we don't finalize while still receiving deltas
      if (finalizationTimerRef.current) {
        clearTimeout(finalizationTimerRef.current);
        finalizationTimerRef.current = null;
        
        // Set a new timer - only if we're in active speech
        if (activeSpeechRef.current) {
          finalizationTimerRef.current = setTimeout(() => {
            finalizeCurrentTranscript();
          }, 800) as unknown as number;
        }
      }
    }
    
    // Handle assistant responses
    if ((event.type === 'response.done' || event.type === 'response.content_part.done') && 
         role === 'assistant' && transcriptContent) {
      console.log(`🔒 [TranscriptAggregator] Saving ASSISTANT transcript with explicit role 'assistant'`);
      await processTranscript(transcriptContent, 'assistant');
    }
  }, [accumulateText, getAccumulatedText, processTranscript, resetAccumulator, finalizeCurrentTranscript]);

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
        console.log(`[TranscriptAggregator] Explicitly saving transcript with role: ${role}`);
        await processTranscript(transcript, role);
        resetAccumulator();
      }
    }
  };
};
