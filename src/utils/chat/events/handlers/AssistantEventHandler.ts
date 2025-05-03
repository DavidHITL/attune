
/**
 * Handler specifically for assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventTypeRegistry } from '../EventTypeRegistry';

export class AssistantEventHandler {
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {
    console.log('[AssistantEventHandler] Initialized');
  }
  
  /**
   * Handle incoming assistant events
   */
  handleEvent(event: any): void {
    // Validate that we're handling the right event type
    if (event && event.type) {
      const role = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
      
      // We should only be handling assistant events, log an error if not
      if (role !== 'assistant') {
        console.error(`[AssistantEventHandler] Received event with incorrect role: ${role}, type: ${event.type}`);
        // Force correct role
        event.explicitRole = 'assistant';
      }
      
      // CRITICAL FIX: Add debug logging
      console.log(`[AssistantEventHandler] Processing event: ${event.type}, role: ${role || 'unknown'}`);
      
      // Process the event with the response parser
      this.responseParser.processEvent(event, 'assistant');
    } else {
      console.warn('[AssistantEventHandler] Received event with no type, skipping');
    }
  }
  
  /**
   * Flush any pending response content
   */
  flushPendingResponse(): void {
    console.log('[AssistantEventHandler] Flushing pending response');
    this.responseParser.flushPendingContent();
  }
}
