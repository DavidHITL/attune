
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useConversation } from '@/hooks/useConversation';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';
import { getMessageQueue } from '@/utils/chat/messageQueue/QueueProvider';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    // Determine role from the event type registry or explicit role
    const messageRole = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
    
    if (!messageRole) {
      return;
    }

    // Strict role validation - critical checkpoint
    if (messageRole !== 'user' && messageRole !== 'assistant') {
      throw new Error(`Invalid role: ${messageRole}. Must be 'user' or 'assistant'.`);
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
      return;
    }

    // Get the centralized message queue - unified path for all messages
    const messageQueue = getMessageQueue();
    if (!messageQueue) {
      throw new Error("No message queue available");
    }
    
    // Queue the message with strict role validation
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
