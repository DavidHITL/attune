
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class EventDispatcher {
  constructor(
    private userEventHandler: UserEventHandler,
    private assistantEventHandler: AssistantEventHandler
  ) {}

  /**
   * Main dispatch method that routes events to the appropriate handler
   * with improved validation and logging
   */
  dispatchEvent(event: any): void {
    // Skip events with no type
    if (!event || !event.type) {
      console.log('[EventDispatcher] Skipping event with no type');
      return;
    }
    
    // Check if this event has a registered handler in the registry
    const registeredHandler = EventTypeRegistry.getHandlerForEvent(event.type);
    if (registeredHandler) {
      console.log(`[EventDispatcher] Using registered handler for event: ${event.type}`);
      try {
        registeredHandler(event);
      } catch (error) {
        console.error(`[EventDispatcher] Error in registered handler for ${event.type}:`, error);
      }
      return;
    }

    // Handle conversation item created events specifically to queue messages
    if (event.type === 'conversation.item.created') {
      console.log('[conversation.item.created] raw event →', event.item);
      
      // Extract role from event - crucial for correct message handling
      const role = event.item?.role; // 'user' | 'assistant'
      if (role !== 'user' && role !== 'assistant') {
        console.error(`[EventDispatcher] Invalid role in conversation.item.created: ${role}`);
        return;
      }
      
      // CRITICAL FIX: Safely handle content regardless of type
      // First check if content exists and then handle it based on type
      const content = event.item?.content;
      const text = typeof content === 'string' ? content.trim() :
                   // Handle object formats that might contain text in different fields
                   (content?.text || content?.value || '').toString().trim();
      
      if (!text) {
        console.warn('[EventDispatcher] No text in item.created, skipping');
        return;
      }
      
      // Get the message queue and queue the message with high priority
      const messageQueue = getMessageQueue();
      if (messageQueue) {
        console.log(`[EventDispatcher] Queueing ${role} message from conversation item with HIGH PRIORITY`);
        messageQueue.queueMessage(role, text, /*priority*/true);
      } else {
        console.error('[EventDispatcher] Cannot queue message - message queue not initialized');
      }
      return; // handled, don't fall through
    }
    
    // Use registry to determine event type - NO DEFAULTS
    const isAssistantEvent = EventTypeRegistry.isAssistantEvent(event.type);
    const isUserEvent = EventTypeRegistry.isUserEvent(event.type);
    
    // Enhanced logging with role information
    if (event.type !== 'input_audio_buffer.append') {
      console.log(`[EventDispatcher] Routing event: ${event.type}, isAssistant=${isAssistantEvent}, isUser=${isUserEvent}, timestamp: ${new Date().toISOString()}`);
    }
    
    // Handle unclassified events
    if (!isAssistantEvent && !isUserEvent && event.type !== 'input_audio_buffer.append') {
      console.error(`[EventDispatcher] ⚠️ UNCLASSIFIED EVENT: ${event.type} - cannot route`);
      return; // Skip unclassified events
    }
    
    // CRITICAL FIX: Route events with EXPLICIT role assignment
    if (isAssistantEvent) {
      console.log(`[EventDispatcher] ⚠️ FORCING Assistant role for event: ${event.type}`);
      
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'assistant';
      
      // Send to assistant handler
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (isUserEvent) {
      console.log(`[EventDispatcher] ⚠️ FORCING User role for event: ${event.type}`);
      
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'user';
      
      // Send to user handler
      this.userEventHandler.handleEvent(event);
    }
  }
}
