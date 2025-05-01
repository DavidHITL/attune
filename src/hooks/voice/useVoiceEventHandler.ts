
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { EventDispatcher } from '@/utils/chat/events/EventDispatcher';
import { UserEventHandler } from '@/utils/chat/events/handlers/UserEventHandler';
import { AssistantEventHandler } from '@/utils/chat/events/handlers/AssistantEventHandler';
import { SystemEventHandler } from '@/utils/chat/events/handlers/SystemEventHandler';
import { useRef } from 'react';
import { useTranscriptHandler } from './useTranscriptHandler';
import { MessageQueue } from '@/utils/chat/messageQueue';
import { ResponseParser } from '@/utils/chat/ResponseParser';

export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  // Create refs for our event handlers to maintain instance identity
  const dispatcherRef = useRef<EventDispatcher | null>(null);
  const responseParserRef = useRef<ResponseParser | null>(null);
  
  const handleVoiceEvent = useCallback((event: any) => {
    console.log(`🎙️ Voice Event Handler - Event Type: ${event.type}`);
    
    // First determine role from EventTypeRegistry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role) {
      console.log(`📝 [useVoiceEventHandler] Event type: ${event.type}, role: ${role}`);
    }
    
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech and transcript events
    logSpeechEvents(event);
    
    // Initialize the dispatcher on first use
    if (!dispatcherRef.current && typeof window !== 'undefined' && window.attuneMessageQueue) {
      // These handlers would normally be initialized once at a higher level
      console.log('🔄 [useVoiceEventHandler] Initializing event handlers with message queue');
      
      // Type check to ensure attuneMessageQueue has the required methods
      if (typeof window.attuneMessageQueue?.queueMessage === 'function') {
        // Initialize a proper ResponseParser instance for the AssistantEventHandler
        if (!responseParserRef.current) {
          responseParserRef.current = new ResponseParser();
          console.log('🔄 [useVoiceEventHandler] Created new ResponseParser instance');
        }
        
        const userHandler = new UserEventHandler(window.attuneMessageQueue);
        const assistantHandler = new AssistantEventHandler(
          window.attuneMessageQueue, 
          responseParserRef.current
        ); 
        const systemHandler = new SystemEventHandler();
        
        dispatcherRef.current = new EventDispatcher(
          userHandler, 
          assistantHandler, 
          systemHandler
        );
        
        console.log('🔄 [useVoiceEventHandler] Event dispatcher successfully initialized');
      } else {
        console.warn('⚠️ [useVoiceEventHandler] Message queue object is missing required methods');
      }
    }
    
    // Use our dispatcher if available (for the new system)
    if (dispatcherRef.current) {
      console.log(`🔄 [useVoiceEventHandler] Routing ${event.type} event through EventDispatcher`);
      dispatcherRef.current.dispatchEvent(event);
    } else {
      // Fallback to the transcript handler (legacy approach)
      console.log(`🔄 [useVoiceEventHandler] Using legacy transcript handler for ${event.type} event`);
      handleTranscriptEvent(event);
    }
    
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
