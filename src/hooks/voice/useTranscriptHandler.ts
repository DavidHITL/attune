
import { useCallback } from 'react';
import { useConversationValidator } from './transcript/useConversationValidator';
import { useConversation } from '@/hooks/useConversation';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { toast } from 'sonner';
import { MessageRole } from '@/utils/chat/events/EventTypes';

export const useTranscriptHandler = () => {
  const { validateConversationContext } = useConversationValidator();
  const { saveMessage } = useConversation();
  
  const handleTranscriptEvent = useCallback((event: any) => {
    console.log('🎯 Transcript Handler - Processing event:', {
      type: event.type,
      timestamp: new Date().toISOString()
    });

    // Determine role from event type using the registry
    const eventRole = EventTypeRegistry.getRoleForEvent(event.type);
    
    if (!eventRole) {
      console.warn(`⚠️ Could not determine message role from event type: ${event.type}`);
      return;
    }
    
    // We only handle user and assistant roles in transcript handler
    // Filter out system messages early
    if (eventRole === 'system') {
      console.log(`⚠️ System event received in transcript handler: ${event.type}, skipping`);
      return;
    }
    
    // Now we know eventRole is either 'user' or 'assistant'
    const messageRole = eventRole as 'user' | 'assistant';
    
    // Extract content based on event type and message role
    let transcriptContent: string | null = null;
    
    if (messageRole === 'user') {
      // Extract user transcript content
      if (event.type === 'transcript' && typeof event.transcript === 'string') {
        transcriptContent = event.transcript;
      } 
      else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
        transcriptContent = event.transcript.text;
      }
      else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
        transcriptContent = event.delta.text;
      }
    } 
    else if (messageRole === 'assistant') {
      // Extract assistant response content
      if (event.type === 'response.done' && event.response?.output?.[0]?.content?.[0]?.transcript) {
        transcriptContent = event.response.output[0].content[0].transcript;
      }
      else if (event.type === 'response.done' && event.response?.content) {
        transcriptContent = event.response.content;
      }
      else if (event.type === 'response.content_part.done' && event.content_part?.text) {
        transcriptContent = event.content_part.text;
      }
    }
    
    // Skip processing if no valid transcript was found
    if (!transcriptContent || transcriptContent.trim() === '') {
      return;
    }

    console.log(`📝 Processing ${messageRole} content:`, {
      role: messageRole,
      contentPreview: transcriptContent.substring(0, 50),
      length: transcriptContent.length
    });

    // Only process when conversation context is valid or we have a message queue
    const hasValidContext = validateConversationContext();
    const hasMessageQueue = typeof window !== 'undefined' && !!window.attuneMessageQueue;
    
    if (!hasValidContext && !hasMessageQueue) {
      console.log('⚠️ No valid conversation context or message queue, skipping transcript processing');
      return;
    }
    
    if (hasMessageQueue) {
      console.log(`🔄 Delegating to message queue: ${messageRole} message`);
      window.attuneMessageQueue?.queueMessage(messageRole, transcriptContent, true);
      
      toast.success(messageRole === 'user' ? "Speech detected" : "AI response received", {
        description: transcriptContent.substring(0, 50) + (transcriptContent.length > 50 ? "..." : ""),
        duration: 3000
      });
      return;
    }

    // Use unified save pathway if we have a valid context
    if (hasValidContext) {
      console.log(`💾 Direct save with explicit role: ${messageRole}`);
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
