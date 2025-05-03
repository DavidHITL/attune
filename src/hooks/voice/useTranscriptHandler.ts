
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '../useConversation';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      hasTranscript: !!event.transcript || !!(event.transcript?.text),
      timestamp: new Date().toISOString()
    });

    // Get the message queue - our single source of truth
    const messageQueue = getMessageQueue();
    if (!messageQueue) {
      console.warn('⚠️ No message queue available for transcript handling');
      return; // Early exit - no queue means no processing
    }

    // IMPROVED: First determine role from the event type registry - no defaults
    // If explicitRole is set, use that with higher priority
    const messageRole = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
    
    if (!messageRole) {
      console.log(`⚠️ Could not determine message role for event type: ${event.type}`);
      return;
    }

    // Additional role validation - critical fix
    if (messageRole !== 'user' && messageRole !== 'assistant') {
      console.error(`❌ Invalid role determined: ${messageRole}. Must be 'user' or 'assistant'. Skipping.`);
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

    // Log with explicit role for debugging
    console.log(`📝 Processing ${messageRole} content:`, {
      role: messageRole,
      contentPreview: transcriptContent.substring(0, 50),
      length: transcriptContent.length
    });
    
    // DIRECTLY QUEUE MESSAGE - single source of truth
    console.log(`🔄 Queueing message with explicit role: ${messageRole}`);
    messageQueue.queueMessage(messageRole, transcriptContent, true);
    
    // Show toast for user feedback
    toast.success(messageRole === 'user' ? "Speech detected" : "AI response received", {
      description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
      duration: 3000
    });
    
  }, [validateConversationContext, saveMessage]);

  return {
    handleTranscriptEvent
  };
};
