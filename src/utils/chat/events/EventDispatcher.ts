
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
    
    // Enhanced logging with clear role information
    if (event.type !== 'input_audio_buffer.append') {
      console.log(`[EventDispatcher] Routing event: ${event.type}, role: ${role || 'unknown'}, timestamp: ${new Date().toISOString()}`);
    }
    
    // Route events to appropriate handlers based on their type with explicit role checks
    if (EventTypeRegistry.isAssistantEvent(event.type)) {
      console.log(`[EventDispatcher] → Sending to AssistantEventHandler: ${event.type} (role: assistant)`);
      
      // Add explicit role to event to prevent misclassification later
      if (!event.explicitRole) {
        event.explicitRole = 'assistant';
      }
      
      // Validate role consistency 
      if (event.explicitRole !== 'assistant') {
        console.warn(`[EventDispatcher] ⚠️ Role mismatch: Event type ${event.type} should be assistant but has explicitRole=${event.explicitRole}`);
        event.explicitRole = 'assistant'; // Force correct role
      }
      
      this.assistantEventHandler.handleEvent(event);
    } 
    else if (EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[EventDispatcher] → Sending to UserEventHandler: ${event.type} (role: user)`);
      
      // Add explicit role to event to prevent misclassification later
      if (!event.explicitRole) {
        event.explicitRole = 'user';
      }
      
      // Validate role consistency
      if (event.explicitRole !== 'user') {
        console.warn(`[EventDispatcher] ⚠️ Role mismatch: Event type ${event.type} should be user but has explicitRole=${event.explicitRole}`);
        event.explicitRole = 'user'; // Force correct role
      }
      
      this.userEventHandler.handleEvent(event);
    }
    else if (event.type !== 'input_audio_buffer.append') {
      // Log events that don't match known types (except audio buffer events)
      console.log(`[EventDispatcher] ⚠️ Unhandled event type: ${event.type}`);
    }
  }
}
