
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

export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  const { handleTranscriptEvent } = useTranscriptHandler();
  
  // Create refs for our event handlers to maintain instance identity
  const dispatcherRef = useRef<EventDispatcher | null>(null);
  
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
      const userHandler = new UserEventHandler(window.attuneMessageQueue);
      const assistantHandler = new AssistantEventHandler(window.attuneMessageQueue, {logEvent: () => {}}); 
      const systemHandler = new SystemEventHandler();
      
      dispatcherRef.current = new EventDispatcher(
        userHandler, 
        assistantHandler, 
        systemHandler
      );
      
      console.log('🔄 Event dispatcher initialized');
    }
    
    // Use our dispatcher if available (for the new system)
    if (dispatcherRef.current) {
      console.log('🔄 Routing event through EventDispatcher');
      dispatcherRef.current.dispatchEvent(event);
    } else {
      // Fallback to the transcript handler (legacy approach)
      console.log('🔄 Using legacy transcript handler');
      handleTranscriptEvent(event);
    }
    
  }, [handleVoiceActivityEvent, logSpeechEvents, handleTranscriptEvent]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
