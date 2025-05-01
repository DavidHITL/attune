
import { useCallback } from 'react';
import { useVoiceActivityState } from './useVoiceActivityState';
import { useVoiceChatLogger } from './useVoiceChatLogger';
import { EventTypeRegistry } from '@/utils/chat/events/EventTypeRegistry';
import { EventDispatcher } from '@/utils/chat/events/EventDispatcher';
import { UserEventHandler } from '@/utils/chat/events/handlers/UserEventHandler';
import { AssistantEventHandler } from '@/utils/chat/events/handlers/AssistantEventHandler';
import { SystemEventHandler } from '@/utils/chat/events/handlers/SystemEventHandler';
import { useRef } from 'react';
import { ResponseParser } from '@/utils/chat/ResponseParser';
import { toast } from 'sonner';

/**
 * Enhanced hook for handling all voice-related events using the modern event dispatcher system.
 * This is the primary event handling system, and legacy systems are deactivated.
 */
export const useVoiceEventHandler = (chatClientRef: React.MutableRefObject<any>) => {
  const { voiceActivityState, handleMessageEvent: handleVoiceActivityEvent } = useVoiceActivityState();
  const { logSpeechEvents } = useVoiceChatLogger();
  
  // Create refs for our event handlers to maintain instance identity
  const dispatcherRef = useRef<EventDispatcher | null>(null);
  const responseParserRef = useRef<ResponseParser | null>(null);
  const handlerInitializedRef = useRef<boolean>(false);
  
  // Make sure we track first-time initialization
  const initializeEventHandler = useCallback(() => {
    if (handlerInitializedRef.current) return true; // Already initialized
    
    if (typeof window !== 'undefined' && window.attuneMessageQueue) {
      // These handlers would normally be initialized once at a higher level
      console.log('🚀 [useVoiceEventHandler] Initializing event handlers with message queue');
      
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
        
        handlerInitializedRef.current = true;
        console.log('✅ [useVoiceEventHandler] Event dispatcher successfully initialized');
        return true;
      } else {
        console.warn('⚠️ [useVoiceEventHandler] Message queue object is missing required methods');
        return false;
      }
    }
    return false;
  }, []);
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Log essential event information but limit frequency of common events
    if (!event.type?.includes('audio_buffer') || Math.random() < 0.01) { // Log only ~1% of audio_buffer events
      console.log(`🎙️ [useVoiceEventHandler] Processing event: ${event.type}`);
    }
    
    // First determine role from EventTypeRegistry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role && !event.type?.includes('audio_buffer')) {
      console.log(`📝 [useVoiceEventHandler] Event type: ${event.type}, role: ${role}`);
    }
    
    // Process voice activity state changes
    handleVoiceActivityEvent(event);
    
    // Log speech events
    logSpeechEvents(event);
    
    // Try to initialize the dispatcher if not already done
    const isInitialized = initializeEventHandler();
    
    // Use our dispatcher if available
    if (isInitialized && dispatcherRef.current) {
      // Avoid excessive logging for high-frequency events
      if (!event.type?.includes('audio_buffer') || Math.random() < 0.01) {
        console.log(`🔄 [useVoiceEventHandler] Routing ${event.type} event through EventDispatcher`);
      }
      
      dispatcherRef.current.dispatchEvent(event);
    } else {
      // Log failure to initialize modern event handling system
      console.warn(`⚠️ [useVoiceEventHandler] Event dispatcher not initialized, event ${event.type} not properly processed`);
    }
    
  }, [handleVoiceActivityEvent, logSpeechEvents, initializeEventHandler]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
