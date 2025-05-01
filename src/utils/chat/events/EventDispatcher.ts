
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { SystemEventHandler } from './handlers/SystemEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';

export class EventDispatcher {
  constructor(
    private userEventHandler: UserEventHandler,
    private assistantEventHandler: AssistantEventHandler,
    private systemEventHandler: SystemEventHandler
  ) {
    console.log('[EventDispatcher] Initialized with all event handlers');
  }

  /**
   * Main dispatch method that routes events to the appropriate handler
   */
  dispatchEvent(event: any): void {
    // Skip events with no type
    if (!event.type) {
      console.log('[EventDispatcher] Skipping event with no type');
      return;
    }

    // Get the role from the event type for logging purposes
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    console.log(`[EventDispatcher] Routing event: ${event.type}, role: ${role || 'unknown'}`);
    
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
      console.log(`[EventDispatcher] Routing SYSTEM event: ${event.type}`);
      this.systemEventHandler.handleEvent(event);
    }
    else {
      // Log events that don't match known types
      console.log(`[EventDispatcher] Unhandled event type: ${event.type}`);
    }
  }
}
