
/**
 * Handler specifically for assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { extractAssistantContent } from '../EventTypes';
import { toast } from 'sonner';

export class AssistantEventHandler {
  private pendingResponse: string | null = null;
  
  constructor(
    private messageQueue: any,
    private responseParser: ResponseParser
  ) {
    console.log('[AssistantEventHandler] Initialized');
  }
  
  handleEvent(event: any): void {
    console.log(`[AssistantEventHandler] Processing assistant event: ${event.type}`);
    
    // Double-check that this is actually an assistant event through the registry
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    if (role !== 'assistant') {
      console.warn(`[AssistantEventHandler] Received non-assistant event: ${event.type}, role: ${role}`);
      return;
    }
    
    // Extract assistant content using our utility function
    const content = extractAssistantContent(event);
    
    // Process content if we have any
    if (content) {
      this.processResponseContent(content, event.type);
    }
    else {
      console.log(`[AssistantEventHandler] No content extracted from ${event.type} event`);
    }
  }
  
  private processResponseContent(content: string, eventType: string): void {
    // Store final response
    if (eventType === 'response.done' || eventType === 'response.content_part.done') {
      console.log(`[AssistantEventHandler] Processing final ASSISTANT response:`, content.substring(0, 50));
      
      // Check if the message queue has the expected interface
      if (typeof this.messageQueue.queueMessage === 'function') {
        // Make sure we're explicitly setting the role to 'assistant'
        this.messageQueue.queueMessage('assistant', content, true);
        
        // Reset any pending response
        this.pendingResponse = null;
        
        // Show notification
        toast.success("AI response received", { 
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 2000
        });
      } else {
        console.error('[AssistantEventHandler] Message queue is missing queueMessage method');
      }
    }
    // Accumulate delta responses
    else if (eventType === 'response.delta') {
      if (!this.pendingResponse) {
        this.pendingResponse = content;
      } else {
        this.pendingResponse += content;
      }
      console.log(`[AssistantEventHandler] Accumulating delta response (now ${this.pendingResponse?.length || 0} chars)`);
    }
  }
  
  flushPendingResponse(): void {
    if (this.pendingResponse && this.pendingResponse.trim().length > 0) {
      console.log(`[AssistantEventHandler] Flushing pending response (${this.pendingResponse.length} chars)`);
      if (typeof this.messageQueue.queueMessage === 'function') {
        this.messageQueue.queueMessage('assistant', this.pendingResponse, true);
        this.pendingResponse = null;
      } else {
        console.error('[AssistantEventHandler] Message queue is missing queueMessage method');
      }
    }
  }
}
