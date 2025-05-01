
/**
 * Event Dispatcher is the central routing mechanism for all events
 * It identifies event types and routes them to specialized handlers
 */
import { UserEventHandler } from './handlers/UserEventHandler';
import { AssistantEventHandler } from './handlers/AssistantEventHandler';
import { SystemEventHandler } from './handlers/SystemEventHandler';
import { EventTypeRegistry } from './EventTypeRegistry';

export class EventDispatcher {
  private eventCounter: { [key: string]: number } = {};
  
  constructor(
    private userEventHandler: UserEventHandler,
    private assistantEventHandler: AssistantEventHandler,
    private systemEventHandler: SystemEventHandler
  ) {
    console.log('[EventDispatcher] ✅ Initialized as PRIMARY event routing system');
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

    // Track event counts for debugging
    this.eventCounter[event.type] = (this.eventCounter[event.type] || 0) + 1;
    
    // Get the role from the event type for logging purposes
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    
    // Don't log audio buffer events too often as they're very frequent
    if (!event.type.includes('audio_buffer') || this.eventCounter[event.type] % 100 === 1) {
      console.log(`[EventDispatcher] Routing event: ${event.type}, role: ${role || 'unknown'}, count: ${this.eventCounter[event.type]}`);
    }
    
    // Route events to appropriate handlers based on their type
    if (EventTypeRegistry.isAssistantEvent(event.type)) {
      console.log(`[EventDispatcher] 🤖 Routing ASSISTANT event: ${event.type}`);
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[EventDispatcher] 👤 Routing USER event: ${event.type}`);
      this.userEventHandler.handleEvent(event);
    }
    else if (EventTypeRegistry.isSystemEvent(event.type)) {
      console.log(`[EventDispatcher] 🔧 Routing SYSTEM event: ${event.type}`);
      this.systemEventHandler.handleEvent(event);
    }
    else {
      // Log events that don't match known types
      console.log(`[EventDispatcher] ⚠️ Unhandled event type: ${event.type}`);
    }
    
    // Log statistics periodically (every 100 events across all types)
    const totalEvents = Object.values(this.eventCounter).reduce((sum, count) => sum + count, 0);
    if (totalEvents % 100 === 0) {
      console.log('[EventDispatcher] Event statistics:', JSON.stringify(this.eventCounter));
    }
  }
}
