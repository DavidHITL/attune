
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';
import { messageSaveService } from '../messaging/MessageSaveService';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class EventDispatcher {
  private processedEvents = new Set<string>();
  
  constructor(
    private userEventHandler: UserEventHandler,
    private assistantEventHandler: AssistantEventHandler
  ) {
    // Clean up processed events periodically
    setInterval(() => {
      this.processedEvents.clear();
    }, 300000); // Clear every 5 minutes
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
    
    // Handle conversation item created events specifically to save messages through unified path
    if (event.type === 'conversation.item.created') {
      console.log('[conversation.item.created] raw event →', event.item);
      
      // Extract role and content from event
      const role = event.item?.role;
      const content = event.item?.content;
      const text = typeof content === 'string' ? content.trim() :
                   (content?.text || content?.value || '').toString().trim();
      
      if (!text) {
        console.warn('[EventDispatcher] No text in item.created, skipping');
        return;
      }
      
      // CRITICAL: Strictly validate role before saving
      if (role !== 'user' && role !== 'assistant') {
        console.error(`[EventDispatcher] Invalid role in conversation.item.created: ${role}`);
        return;
      }
      
      // Get the centralized message queue - use unified path for all messages
      const messageQueue = getMessageQueue();
      if (messageQueue) {
        // Queue the message with correct role through unified path
        console.log(`[EventDispatcher] Queueing ${role} message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        messageQueue.queueMessage(role, text, true);
      } else {
        // Fallback to direct save if no queue
        messageSaveService.saveMessageToDatabase({
          role,
          content: text
        });
      }
      
      return; // handled, don't fall through
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
      console.error(`[EventDispatcher] ⚠️ UNCLASSIFIED EVENT: ${event.type} - cannot route`);
      return;
    }
    
    // CRITICAL FIX: Route events with EXPLICIT role assignment
    if (isAssistantEvent) {
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'assistant';
      
      // Send to assistant handler
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (isUserEvent) {
      // Set explicit role marker to prevent any confusion downstream
      event.explicitRole = 'user';
      
      // Send to user handler
      this.userEventHandler.handleEvent(event);
    }
  }
}
