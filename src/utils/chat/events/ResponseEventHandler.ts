
import { EventType, isEventType } from './EventTypes';
import { AssistantResponseHandler } from '../responses/AssistantResponseHandler';
import { getMessageQueue } from '../messageQueue/QueueProvider';

/**
 * Handler for assistant response events
 */
export class ResponseEventHandler {
  private processedResponses = new Set<string>();
  
  constructor(private responseHandler: AssistantResponseHandler) {
    // Clear processed responses cache periodically
    setInterval(() => {
      this.processedResponses.clear();
    }, 300000); // Clear every 5 minutes
  }

  /**
   * Process assistant response events
   */
  handleAssistantResponse(event: any): void {
    // Handle assistant response start
    if (isEventType(event, EventType.ResponseCreated)) {
      this.responseHandler.handleResponseCreated();
    }
    
    // Handle assistant message content
    if (isEventType(event, EventType.ResponseDelta)) {
      this.responseHandler.handleResponseDelta(event);
    }
    
    // Handle assistant message completion
    if (isEventType(event, EventType.ResponseDone)) {
      // Extract content from the response done event
      const content = this.responseHandler.extractCompletedResponseFromEvent(event);
      
      if (content && content.trim()) {
        // Generate fingerprint for deduplication
        const contentFingerprint = `response:${content.substring(0, 100)}`;
        
        // Skip if we've already processed this exact response
        if (this.processedResponses.has(contentFingerprint)) {
          console.log(`[ResponseEventHandler] Skipping duplicate assistant response`);
          return;
        }
        
        // Mark as processed to prevent duplicates
        this.processedResponses.add(contentFingerprint);
        
        // Get the message queue - our single source of truth
        const messageQueue = getMessageQueue();
        if (messageQueue) {
          console.log(`[ResponseEventHandler] Routing assistant response to message queue: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
          // CRITICAL: Force the role to be 'assistant'
          messageQueue.queueMessage('assistant', content, true);
        } else {
          console.warn('[ResponseEventHandler] No message queue available for routing assistant response');
          // Fall back to direct handler if queue not available
          this.responseHandler.handleResponseDone(event);
        }
      } else {
        // If no content was extracted, call the original handler
        this.responseHandler.handleResponseDone(event);
      }
    }
    
    // Additional handling for edge cases - handle truncated conversations
    if (isEventType(event, EventType.ConversationTruncated)) {
      this.responseHandler.handleConversationTruncated();
    }
    
    // Handle finalized content parts that might contain the full response
    if (isEventType(event, EventType.ResponseContentPartDone) && event.content) {
      const content = typeof event.content === 'string' ? event.content : 
                     (event.content_part?.text || event.content?.text || null);
      
      if (content && content.trim()) {
        // Generate fingerprint for deduplication
        const contentFingerprint = `content_part:${content.substring(0, 100)}`;
        
        // Skip if we've already processed this exact content part
        if (this.processedResponses.has(contentFingerprint)) {
          console.log(`[ResponseEventHandler] Skipping duplicate content part`);
          return;
        }
        
        // Mark as processed to prevent duplicates
        this.processedResponses.add(contentFingerprint);
        
        // Get the message queue - our single source of truth
        const messageQueue = getMessageQueue();
        if (messageQueue) {
          console.log(`[ResponseEventHandler] Routing content part to message queue: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
          // CRITICAL: Force the role to be 'assistant'
          messageQueue.queueMessage('assistant', content, true);
        } else {
          // Fall back to direct handler
          this.responseHandler.handleContentPartDone(content);
        }
      } else {
        this.responseHandler.handleContentPartDone(event.content);
      }
    }
  }

  /**
   * For cleanup - save any pending response
   */
  flushPendingResponse(): void {
    this.responseHandler.flushPendingResponse();
  }
}
