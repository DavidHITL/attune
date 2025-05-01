
/**
 * Specialized handler for assistant events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventType } from '../EventTypes';

export class AssistantEventHandler {
  private pendingResponse: string | null = null;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {}

  /**
   * Process an assistant event
   */
  handleEvent(event: any): void {
    // If this is a response.done event with content, directly save the message
    if (event.type === 'response.done' && event.response?.content) {
      const content = event.response.content;
      console.log(`[AssistantEventHandler] 💾 Saving complete assistant response, length: ${content.length}`);
      console.log(`[AssistantEventHandler] 🔍 EXPLICITLY setting role=assistant for response.done content`);
      
      // CRITICAL FIX: Log role explicitly here for monitoring
      console.log(`[AssistantEventHandler] 🔒 Saving with VERIFIED ROLE: assistant`);
      
      this.messageQueue.queueMessage('assistant', content);
      this.pendingResponse = null; // Reset pending state
      return;
    }
    
    // If this is a content part done event, save it directly
    if (event.type === 'response.content_part.done' && event.content_part?.text) {
      const content = event.content_part.text;
      console.log(`[AssistantEventHandler] 💾 Saving content part, length: ${content.length}`);
      console.log(`[AssistantEventHandler] 🔍 EXPLICITLY setting role=assistant for content_part.done`);
      
      // CRITICAL FIX: Log role explicitly here for monitoring
      console.log(`[AssistantEventHandler] 🔒 Saving with VERIFIED ROLE: assistant`);
      
      this.messageQueue.queueMessage('assistant', content);
      return;
    }

    // For response.delta events, accumulate content until complete
    if (event.type === 'response.delta' && event.delta?.content) {
      if (this.pendingResponse === null) {
        this.pendingResponse = '';
      }
      
      this.pendingResponse += event.delta.content;
      // Don't save yet, wait for response.done
    }
  }

  /**
   * Flush any pending assistant response
   */
  flushPendingResponse(): void {
    if (this.pendingResponse) {
      console.log(`[AssistantEventHandler] 🧹 Flushing pending assistant response, length: ${this.pendingResponse.length}`);
      console.log(`[AssistantEventHandler] 🔍 EXPLICITLY setting role=assistant for flushed response`);
      
      // CRITICAL FIX: Log role explicitly here for monitoring
      console.log(`[AssistantEventHandler] 🔒 Saving with VERIFIED ROLE: assistant`);
      
      this.messageQueue.queueMessage('assistant', this.pendingResponse);
      this.pendingResponse = null;
    }
  }
}
