
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { toast } from 'sonner';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      timestamp: new Date().toISOString()
    });

    // FIX: Initialize with no default role - require explicit determination
    let transcriptContent: string | null = null;
    let messageRole: 'user' | 'assistant' | null = null;
    
    // Explicitly determine role from event type
    if (event.type === 'response.done' || 
        event.type === 'response.delta' || 
        event.type === 'response.content_part.done') {
      messageRole = 'assistant';
      console.log('🤖 Assistant event detected:', event.type);
    } else if (event.type === 'transcript' || 
               event.type === 'response.audio_transcript.delta' ||
               event.type === 'response.audio_transcript.done') {
      messageRole = 'user';
      console.log('👤 User event detected:', event.type);
    }
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      console.log("📝 Found direct transcript string:", transcriptContent.substring(0, 50));
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      console.log("📝 Found transcript in audio_transcript.done event:", transcriptContent.substring(0, 50));
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      console.log("📝 Found transcript in audio_transcript.done delta:", transcriptContent.substring(0, 50));
    }
    else if (event.type === 'response.done' && event.response?.output?.[0]?.content?.[0]?.transcript) {
      transcriptContent = event.response.output[0].content[0].transcript;
      console.log("📝 Found transcript in response.done event:", transcriptContent.substring(0, 50));
    }
    else if (event.type === 'response.done' && event.response?.content) {
      transcriptContent = event.response.content;
      console.log("💬 Found assistant response in response.done event:", transcriptContent?.substring(0, 50));
    }
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      transcriptContent = event.content_part.text;
      console.log("💬 Found assistant content part:", transcriptContent.substring(0, 50));
    }
    
    // Skip processing if no valid transcript was found or role couldn't be determined
    if (!transcriptContent || transcriptContent.trim() === '') {
      if (event.type === 'response.audio_transcript.done' || 
          event.type === 'transcript' || 
          event.type === 'response.done' || 
          event.type === 'response.content_part.done') {
        console.log("⚠️ No valid transcript or content found in event", event.type);
      }
      return;
    }

    // CRITICAL FIX: Ensure we have a valid role before proceeding
    if (!messageRole) {
      console.warn(`⚠️ Could not determine message role from event type: ${event.type}`);
      return;
    }

    // Only process transcript events when conversation context is valid or we have a message queue
    const hasValidContext = validateConversationContext();
    const hasMessageQueue = typeof window !== 'undefined' && !!window.attuneMessageQueue;
    
    if (!hasValidContext && !hasMessageQueue) {
      console.log('⚠️ No valid conversation context or message queue, skipping transcript processing');
      return;
    }
    
    // Process the transcript content with correct role
    console.log(`📝 Processing ${messageRole} content:`, {
      role: messageRole,
      contentPreview: transcriptContent.substring(0, 50),
      length: transcriptContent.length
    });
      
    if (hasMessageQueue) {
      console.log(`🔄 Queueing message with role: ${messageRole}`);
      // Pass the determined role to the message queue
      window.attuneMessageQueue?.queueMessage(messageRole, transcriptContent, true);
      
      toast.success(messageRole === 'user' ? "Speech detected" : "AI response received", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
      return;
    }

    // Use unified save pathway with explicit role if we have a valid context
    if (hasValidContext) {
      console.log(`💾 Saving transcript via direct save with role: ${messageRole}`);
      saveMessage({
        role: messageRole,
        content: transcriptContent
      }).then(savedMessage => {
        console.log(`Message save result (role: ${messageRole}):`, savedMessage ? 'Success' : 'Failed');
      }).catch(error => {
        console.error(`Error saving ${messageRole} transcript:`, error);
      });
    }
  }, [validateConversationContext, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
