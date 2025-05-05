
/**
 * Handler specifically for assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { getMessageQueue } from '../../messageQueue/QueueProvider';
import { messageSaveService } from '../../messaging/MessageSaveService';

export class AssistantEventHandler {
  private processedResponses = new Set<string>();
  private eventCount = 0;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {
    console.log('[AssistantEventHandler] Initialized');
    
    // Clean up processed responses cache periodically
    setInterval(() => {
      this.processedResponses.clear();
    }, 300000); // Clear every 5 minutes
  }
  
  /**
   * Handle incoming assistant events
   */
  handleEvent(event: any): void {
    this.eventCount++;
    
    // Validate that we're handling the right event type
    if (event && event.type) {
      // CRITICAL FIX: Always force 'assistant' role in AssistantEventHandler
      // First check if we have an explicit role from dispatcher
      const explicitRole = event.explicitRole;
      
      // We should only be handling assistant events, log an error if not
      if (explicitRole && explicitRole !== 'assistant') {
        console.error(`[AssistantEventHandler] Received event with incorrect explicit role: ${explicitRole}, type: ${event.type}`);
        console.error(`[AssistantEventHandler] This is a critical routing error`);
        return; // Don't process events with mismatched roles - critical protection
      }
      
      // CRITICAL FIX: Always force correct role in assistant event handler
      event.explicitRole = 'assistant';
      
      // CRITICAL FIX: Add debug logging
      if (this.eventCount % 10 === 0 || event.type === 'response.done') {
        console.log(`[AssistantEventHandler] Processing event: ${event.type} with FORCED ASSISTANT role, event #${this.eventCount}`);
      }
      
      // Process the event with the response parser - pass 'assistant' as the guaranteed role
      this.responseParser.processEvent(event, 'assistant');
      
      // For done events, use the centralized message save path
      if (event.type === 'response.done' || event.type === 'response.content_part.done') {
        let content = null;
        
        if (event.type === 'response.done') {
          content = this.responseParser.extractCompletedResponseFromDoneEvent(event);
        } else if (event.type === 'response.content_part.done' && event.content_part?.text) {
          content = event.content_part.text;
        }
        
        if (content && content.trim()) {
          // Generate a simple key for deduplication
          const contentKey = `${event.type}:${content.substring(0, 100)}`;
          
          // Skip if we've already processed this content
          if (this.processedResponses.has(contentKey)) {
            console.log(`[AssistantEventHandler] Skipping duplicate assistant response`);
            return;
          }
          
          // Mark as processed to prevent duplicates
          this.processedResponses.add(contentKey);
          
          console.log(`[AssistantEventHandler] Routing assistant response to queue: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
          
          // Get centralized message queue
          const globalMessageQueue = getMessageQueue();
          
          // If there's a global queue, use it for unified processing
          if (globalMessageQueue) {
            // Enqueue with strict 'assistant' role for unified processing
            globalMessageQueue.queueMessage('assistant', content, true);
          } else {
            // Fallback to direct save if no queue available
            messageSaveService.saveMessageToDatabase({
              role: 'assistant',
              content: content
            });
          }
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
