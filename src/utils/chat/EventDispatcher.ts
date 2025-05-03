
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';

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

    // CRITICAL FIX: Clear, absolute role determination with no fallbacks
    // For assistant events, always set explicitRole to 'assistant'
    // For user events, always set explicitRole to 'user'
    // This is the single source of truth for event roles
    
    // Use registry to determine event type
    const isAssistantEvent = EventTypeRegistry.isAssistantEvent(event.type);
    const isUserEvent = EventTypeRegistry.isUserEvent(event.type);
    
    // Enhanced logging with role information
    if (event.type !== 'input_audio_buffer.append') {
      console.log(`[EventDispatcher] Routing event: ${event.type}, isAssistant=${isAssistantEvent}, isUser=${isUserEvent}, timestamp: ${new Date().toISOString()}`);
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
    else if (event.type !== 'input_audio_buffer.append') {
      // Log events that don't match known types (except audio buffer events)
      console.log(`[EventDispatcher] ⚠️ Unhandled event type: ${event.type}`);
    }
  }
}
