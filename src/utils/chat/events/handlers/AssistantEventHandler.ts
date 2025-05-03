
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
      // CRITICAL FIX: Always force 'assistant' role in AssistantEventHandler
      // First check if we have an explicit role from dispatcher
      const explicitRole = event.explicitRole;
      
      // We should only be handling assistant events, log an error if not
      if (explicitRole && explicitRole !== 'assistant') {
        console.error(`[AssistantEventHandler] Received event with incorrect explicit role: ${explicitRole}, type: ${event.type}`);
      }
      
      // CRITICAL FIX: Always force correct role in assistant event handler
      event.explicitRole = 'assistant';
      
      // CRITICAL FIX: Add debug logging
      console.log(`[AssistantEventHandler] Processing event: ${event.type} with FORCED ASSISTANT role`);
      
      // Process the event with the response parser - pass 'assistant' as the guaranteed role
      this.responseParser.processEvent(event, 'assistant');
      
      // CRITICAL FIX: For done events, save the assistant response to the message queue
      if (event.type === 'response.done' || event.type === 'response.content_part.done') {
        let content = null;
        
        if (event.type === 'response.done') {
          content = this.responseParser.extractCompletedResponseFromDoneEvent(event);
        } else if (event.type === 'response.content_part.done' && event.content_part?.text) {
          content = event.content_part.text;
        }
        
        if (content && content.trim()) {
          console.log(`[AssistantEventHandler] Saving assistant response: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
          // Add the message to the queue with explicit 'assistant' role
          this.messageQueue.queueMessage('assistant', content, true);
        }
      }
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
