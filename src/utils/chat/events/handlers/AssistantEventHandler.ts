
/**
 * Handler specifically for assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { toast } from 'sonner';

export class AssistantEventHandler {
  private assistantResponse: string = '';
  private pendingResponse: boolean = false;
  private messagesSaved: number = 0;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {
    console.log('[AssistantEventHandler] Initialized');
  }
  
  handleEvent(event: any): void {
    console.log(`[AssistantEventHandler] Processing assistant event: ${event.type}`);
    
    // Verify this is actually an assistant event
    if (!EventTypeRegistry.isAssistantEvent(event.type)) {
      console.log(`[AssistantEventHandler] Event ${event.type} is not an assistant event, skipping`);
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole = 'assistant';
    
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
        console.log(`[AssistantEventHandler] Saving ASSISTANT response: "${content.substring(0, 50)}..."`, {
          contentLength: content.length,
          timestamp: new Date().toISOString(),
          messageNumber: ++this.messagesSaved,
          forcedRole: forcedRole
        });
        
        // Always explicitly save with assistant role - NEVER use event.role or any other source
        this.messageQueue.queueMessage(forcedRole, content, true);
        
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
      console.log(`[AssistantEventHandler] Content part: "${content.substring(0, 50)}..."`, {
        contentLength: content.length,
        timestamp: new Date().toISOString(),
        messageNumber: ++this.messagesSaved,
        forcedRole: forcedRole
      });
      
      // Always force assistant role - never derive from event or registry
      this.messageQueue.queueMessage(forcedRole, content, true);
    }
    // Handle response.delta event
    else if (event.type.includes('response.delta') && !event.type.includes('audio')) {
      // Accumulate delta content
      const deltaContent = this.responseParser.extractContentFromDelta(event);
      if (deltaContent) {
        this.assistantResponse += deltaContent;
        this.pendingResponse = true;
        
        // Only log occasionally to avoid spam
        if (this.assistantResponse.length % 100 === 0) {
          console.log(`[AssistantEventHandler] Accumulating delta content (length: ${this.assistantResponse.length})`);
        }
      }
    }
  }
  
  /**
   * Flush any pending response that hasn't been sent yet
   */
  flushPendingResponse(): void {
    if (this.pendingResponse && this.assistantResponse.trim()) {
      console.log(`[AssistantEventHandler] Flushing pending response: "${this.assistantResponse.substring(0, 50)}..."`, {
        contentLength: this.assistantResponse.length,
        timestamp: new Date().toISOString(),
        messageNumber: ++this.messagesSaved,
        forcedRole: 'assistant'
      });
      
      // Always explicitly use 'assistant' role when flushing
      this.messageQueue.queueMessage('assistant', this.assistantResponse, true);
      this.assistantResponse = '';
      this.pendingResponse = false;
    } else {
      console.log('[AssistantEventHandler] No pending response to flush');
    }
  }
}
