
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
  
  // Track processed event IDs to prevent double processing
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  
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
  
  // Generate a unique event ID to prevent duplicate processing
  const generateEventId = useCallback((event: any): string => {
    // For transcript events, use the transcript content as part of the ID
    if (event.type === 'transcript' && event.transcript) {
      return `${event.type}-${typeof event.transcript === 'string' ? 
        event.transcript.substring(0, 20) : 'object'}-${Date.now()}`;
    }
    
    // For response events, use content if available
    if (event.type === 'response.done' && event.response?.content) {
      return `${event.type}-${event.response.content.substring(0, 20)}-${Date.now()}`;
    }
    
    // Default ID with timestamp to make it unique
    return `${event.type}-${Math.random().toString(36).substring(2, 7)}-${Date.now()}`;
  }, []);
  
  const handleVoiceEvent = useCallback((event: any) => {
    // Deduplicate events
    const eventId = generateEventId(event);
    if (processedEventIdsRef.current.has(eventId)) {
      return; // Skip already processed events
    }
    
    processedEventIdsRef.current.add(eventId);
    
    // Limit size of processed events set
    if (processedEventIdsRef.current.size > 1000) {
      processedEventIdsRef.current = new Set(
        Array.from(processedEventIdsRef.current).slice(-500)
      );
    }
    
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
    
  }, [handleVoiceActivityEvent, logSpeechEvents, initializeEventHandler, generateEventId]);

  return {
    voiceActivityState,
    handleVoiceEvent
  };
};
