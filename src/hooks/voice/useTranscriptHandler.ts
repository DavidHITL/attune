
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
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

    // IMPROVED: First determine role from the event type registry - no defaults
    const messageRole = EventTypeRegistry.getRoleForEvent(event.type);
    if (!messageRole) {
      console.log(`⚠️ Could not determine message role for event type: ${event.type}`);
      return;
    }

    let transcriptContent: string | null = null;
    
    // Extract content from various event formats
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
    }
    else if (event.type === 'response.done' && event.response?.content) {
      transcriptContent = event.response.content;
    }
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      transcriptContent = event.content_part.text;
    }
    
    // Skip processing if no valid content was found
    if (!transcriptContent || transcriptContent.trim() === '') {
      if (event.type === 'response.audio_transcript.done' || 
          event.type === 'transcript' || 
          event.type === 'response.done' || 
          event.type === 'response.content_part.done') {
        console.log("⚠️ No valid content found in event", event.type);
      }
      return;
    }

    console.log(`📝 Processing ${messageRole} content:`, {
      role: messageRole,
      contentPreview: transcriptContent.substring(0, 50),
      length: transcriptContent.length
    });
    
    // Only process when we have a valid context or message queue
    const hasValidContext = validateConversationContext();
    const hasMessageQueue = typeof window !== 'undefined' && !!window.attuneMessageQueue;
    
    if (!hasValidContext && !hasMessageQueue) {
      console.log('⚠️ No valid conversation context or message queue');
      return;
    }
      
    if (hasMessageQueue) {
      console.log(`🔄 Queueing message with explicit role: ${messageRole}`);
      window.attuneMessageQueue?.queueMessage(messageRole, transcriptContent, true);
      
      toast.success(messageRole === 'user' ? "Speech detected" : "AI response received", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
      return;
    }

    // Direct save with explicit role
    if (hasValidContext) {
      console.log(`💾 Saving via direct save with role: ${messageRole}`);
      saveMessage({
        role: messageRole,
        content: transcriptContent
      }).catch(error => {
        console.error(`Error saving message:`, error);
      });
    }
  }, [validateConversationContext, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
