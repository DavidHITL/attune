
/**
 * Handler specifically for assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { toast } from 'sonner';
import { EventTypeRegistry } from '../EventTypeRegistry';

export class AssistantEventHandler {
  private assistantResponse: string = '';
  private pendingResponse: boolean = false;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {}
  
  handleEvent(event: any): void {
    // Double-check that this is actually an assistant event before proceeding
    if (!EventTypeRegistry.isAssistantEvent(event.type)) {
      console.warn(`[AssistantEventHandler] Received non-assistant event: ${event.type}, ignoring`);
      return;
    }
    
    console.log(`[AssistantEventHandler] Processing ASSISTANT event: ${event.type}`);
    
    // Handle response.done event
    if (event.type === 'response.done') {
      let content = '';
      
      if (event.response?.content) {
        content = event.response.content;
      } else {
        content = this.responseParser.extractCompletedResponseFromDoneEvent(event) || 
                  this.assistantResponse;
      }
      
      if (content && content.trim()) {
        console.log(`[AssistantEventHandler] Saving ASSISTANT response: "${content.substring(0, 50)}..."`);
        // Always save assistant responses with assistant role
        this.messageQueue.queueMessage('assistant', content, true);
        
        toast.success("AI response received", { 
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 2000
        });
      }
      
      // Reset state after processing
      this.assistantResponse = '';
      this.pendingResponse = false;
    }
    // Handle content part done event
    else if (event.type === 'response.content_part.done' && event.content_part?.text) {
      const content = event.content_part.text;
      console.log(`[AssistantEventHandler] Content part: "${content.substring(0, 50)}..."`);
      
      // Always save assistant responses with assistant role
      this.messageQueue.queueMessage('assistant', content, true);
    }
    // Handle response.delta event
    else if (event.type.includes('response.delta') && !event.type.includes('audio')) {
      // Accumulate delta content
      const deltaContent = this.responseParser.extractContentFromDelta(event);
      if (deltaContent) {
        this.assistantResponse += deltaContent;
        this.pendingResponse = true;
      }
    }
  }
  
  /**
   * Flush any pending response that hasn't been sent yet
   */
  flushPendingResponse(): void {
    if (this.pendingResponse && this.assistantResponse.trim()) {
      console.log(`[AssistantEventHandler] Flushing pending response: "${this.assistantResponse.substring(0, 50)}..."`);
      this.messageQueue.queueMessage('assistant', this.assistantResponse, true);
      this.assistantResponse = '';
      this.pendingResponse = false;
    }
  }
}
