
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
   */
  dispatchEvent(event: any): void {
    // Skip events with no type
    if (!event.type) {
      console.log('[EventDispatcher] Skipping event with no type');
      return;
    }

    const eventCategory = EventTypeRegistry.getEventCategoryName(event.type);
    console.log(`[EventDispatcher] Routing ${eventCategory} event: ${event.type}`);
    
    // Route events to appropriate handlers based on their type
    if (EventTypeRegistry.isAssistantEvent(event.type)) {
      console.log(`[EventDispatcher] Routing ASSISTANT event: ${event.type}`);
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[EventDispatcher] Routing USER event: ${event.type}`);
      this.userEventHandler.handleEvent(event);
    }
    else if (EventTypeRegistry.isSystemEvent(event.type)) {
      console.log(`[EventDispatcher] Received SYSTEM event: ${event.type} (no handling needed)`);
    }
    else {
      // Log events that don't match known types
      console.log(`[EventDispatcher] Unhandled event type: ${event.type}`);
    }
  }
}
