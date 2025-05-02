
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

    // Determine role and event category
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    
    // Log event routing for non-audio-buffer events
    if (event.type !== 'input_audio_buffer.append') {
      console.log(`[EventDispatcher] Routing event: ${event.type}, role: ${role || 'unknown'}`);
    }
    
    // Route events to appropriate handlers based on their type
    if (EventTypeRegistry.isAssistantEvent(event.type)) {
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (EventTypeRegistry.isUserEvent(event.type)) {
      this.userEventHandler.handleEvent(event);
    }
    else if (event.type !== 'input_audio_buffer.append') {
      // Log events that don't match known types (except audio buffer events)
      console.log(`[EventDispatcher] Unhandled event type: ${event.type}`);
    }
  }
}
