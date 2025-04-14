
import { EventType, isEventType } from './EventTypes';
import { AssistantResponseHandler } from '../responses/AssistantResponseHandler';

/**
 * Handler for assistant response events
 */
export class ResponseEventHandler {
  constructor(private responseHandler: AssistantResponseHandler) {}

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
      this.responseHandler.handleResponseDone(event);
    }
    
    // Additional handling for edge cases - handle truncated conversations
    if (isEventType(event, EventType.ConversationTruncated)) {
      this.responseHandler.handleConversationTruncated();
    }
    
    // Handle finalized content parts that might contain the full response
    if (isEventType(event, EventType.ContentPartDone) && event.content) {
      this.responseHandler.handleContentPartDone(event.content);
    }
  }

  /**
   * For cleanup - save any pending response
   */
  flushPendingResponse(): void {
    this.responseHandler.flushPendingResponse();
  }
}
