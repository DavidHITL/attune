
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';
import { messageSaveService } from '../messaging/MessageSaveService';
import { getMessageQueue } from '../messageQueue/QueueProvider';
import { handleSessionCreated } from './handlers/SessionEventHandler';

export class EventDispatcher {
  private processedEvents = new Set<string>();
  private dispatchedEventCount = {
    user: 0,
    assistant: 0,
    unknown: 0
  };
  
  constructor(
    private userEventHandler: UserEventHandler,
    private assistantEventHandler: AssistantEventHandler
  ) {
    // Clean up processed events periodically
    setInterval(() => {
      this.processedEvents.clear();
    }, 300000); // Clear every 5 minutes
    
    console.log('[EventDispatcher] Initialized with event handlers');
  }

  /**
   * Main dispatch method that routes events to the appropriate handler
   * with strict role enforcement
   */
  dispatchEvent(event: any): void {
    // Skip events with no type
    if (!event || !event.type) {
      console.log('[EventDispatcher] Skipping event with no type');
      return;
    }
    
    // ENHANCED: Handle Whisper transcription events specifically with increased logging
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      console.log('[EventDispatcher] Processing input_audio_transcription.completed event');
      const transcript = event.transcript;
      
      if (transcript && typeof transcript === 'string' && transcript.trim() !== '') {
        console.log(`[EventDispatcher] Found transcript text: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
        
        // Create a fingerprint to prevent duplicate processing
        const eventFingerprint = `transcript:${transcript.substring(0, 50)}:${Date.now()}`;
        if (this.processedEvents.has(eventFingerprint)) {
          console.log('[EventDispatcher] Skipping duplicate transcript event');
          return;
        }
        
        // Mark as processed
        this.processedEvents.add(eventFingerprint);
        
        // Get the message queue and queue this as a user message with high priority
        const messageQueue = getMessageQueue();
        if (messageQueue) {
          console.log('[EventDispatcher] Queueing transcript text as user message');
          // High priority ensures this is processed immediately
          messageQueue.queueMessage('user', transcript, true);
        } else {
          console.error('[EventDispatcher] No message queue available for transcript text');
          // As a fallback, try to use the message save service directly
          messageSaveService.saveMessageToDatabase({
            role: 'user',
            content: transcript
          }).catch(err => {
            console.error('[EventDispatcher] Failed to save transcript via direct service:', err);
          });
        }
      } else {
        console.log('[EventDispatcher] No valid transcript text in event');
      }
      
      return; // Handled this event, don't fall through to other handlers
    }
    
    // NEW: First handle session events which require special processing
    if (event.type === 'session.created') {
      console.log('[EventDispatcher] Processing session.created event');
      // Call session event handler first to establish conversation ID early
      handleSessionCreated(event)
        .then((conversationId) => {
          if (conversationId) {
            console.log(`[EventDispatcher] Session created with conversation ID: ${conversationId}`);
            
            // Trigger event to notify other components that conversation ID is ready
            if (typeof document !== 'undefined') {
              document.dispatchEvent(
                new CustomEvent('conversationIdReady', { detail: { conversationId } })
              );
            }
            
            // Mark the message queue as initialized with the conversation ID
            const messageQueue = getMessageQueue();
            if (messageQueue) {
              console.log(`[EventDispatcher] Setting message queue as initialized with conversation ID: ${conversationId}`);
              messageQueue.setConversationInitialized();
            }
          }
        })
        .catch((error) => {
          console.error('[EventDispatcher] Error handling session creation:', error);
        });
    }
    
    // IMPROVED: Handle conversation item created events with strict role checking 
    // and skip assistant role to prevent duplicate message handling
    if (event.type === 'conversation.item.created') {
      // Extract role and content from event with improved validation
      const role = event.item?.role;
      
      // Skip if no valid role - critical for preventing misclassification
      if (role !== 'user' && role !== 'assistant') {
        console.error(`[EventDispatcher] Invalid role in conversation.item.created: ${role || 'undefined'}`);
        return;
      }
      
      // Skip assistant messages from conversation.item.created to prevent duplicates
      // Assistant messages are already handled via response events like response.done
      if (role === 'assistant') {
        console.log('[EventDispatcher] Skipping ASSISTANT conversation.item.created to prevent duplicates');
        return;
      }
      
      console.log(`[EventDispatcher] Processing conversation.item.created with role: ${role}`);
      
      const content = event.item?.content;
      const text = typeof content === 'string' ? content.trim() :
                  (content?.text || content?.value || '').toString().trim();
      
      if (!text) {
        console.warn('[EventDispatcher] No text in item.created, skipping');
        return;
      }
      
      // Create a fingerprint for this event to prevent duplicates
      const eventFingerprint = `${role}:${text.substring(0, 50)}:${Date.now()}`;
      if (this.processedEvents.has(eventFingerprint)) {
        console.log(`[EventDispatcher] Skipping duplicate conversation.item.created event for ${role}`);
        return;
      }
      
      // Mark as processed
      this.processedEvents.add(eventFingerprint);
      
      // Route only user messages from conversation.item.created
      // We explicitly only handle user role here since we're skipping assistant role
      console.log('[EventDispatcher] Routing USER conversation.item to user handler');
      // Set explicit role and route to user handler
      event.explicitRole = 'user';
      this.userEventHandler.handleEvent(event);
      
      return; // handled, don't fall through
    }
    
    // IMPORTANT: Look specifically for input_audio_activity_started/stopped events
    if (event.type === 'input_audio_activity_started') {
      console.log('[EventDispatcher] User started speaking');
      // This is important for UI updates to show the user is speaking
      return;
    }
    
    if (event.type === 'input_audio_activity_stopped') {
      console.log('[EventDispatcher] User stopped speaking');
      // This is important for UI updates to show the user has stopped speaking
      return;
    }
    
    // Determine event type from registry - NO DEFAULTS
    const isAssistantEvent = EventTypeRegistry.isAssistantEvent(event.type);
    const isUserEvent = EventTypeRegistry.isUserEvent(event.type);
    
    // Skip audio buffer events from logging to reduce noise
    if (event.type !== 'input_audio_buffer.append') {
      console.log(`[EventDispatcher] Routing event: ${event.type}, isAssistant=${isAssistantEvent}, isUser=${isUserEvent}`);
    }
    
    // Handle unclassified events
    if (!isAssistantEvent && !isUserEvent && event.type !== 'input_audio_buffer.append') {
      // NEW: Don't log errors for session events which are handled above
      if (!event.type.startsWith('session.') && !event.type.startsWith('output_audio_buffer')) {
        console.warn(`[EventDispatcher] UNCLASSIFIED EVENT: ${event.type}`);
        this.dispatchedEventCount.unknown++;
      }
      return;
    }
    
    // CRITICAL FIX: Route events with EXPLICIT role assignment
    if (isAssistantEvent) {
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'assistant';
      this.dispatchedEventCount.assistant++;
      
      // Send to assistant handler
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (isUserEvent) {
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'user';
      this.dispatchedEventCount.user++;
      
      // Send to user handler
      this.userEventHandler.handleEvent(event);
    }
    
    // Periodically log dispatch statistics for debugging
    if ((this.dispatchedEventCount.user + this.dispatchedEventCount.assistant) % 100 === 0) {
      console.log(`[EventDispatcher] Event stats - User: ${this.dispatchedEventCount.user}, Assistant: ${this.dispatchedEventCount.assistant}, Unknown: ${this.dispatchedEventCount.unknown}`);
    }
  }
}
