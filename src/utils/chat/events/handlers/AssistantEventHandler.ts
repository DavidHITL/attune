
/**
 * Handler specifically for assistant response events
 * This is the PRIMARY handler for processing all assistant response events
 */
import { MessageQueue } from '../../messageQueue';
import { ResponseParser } from '../../ResponseParser';
import { EventTypeRegistry } from '../EventTypeRegistry';
import { extractAssistantContent } from '../EventTypes';
import { toast } from 'sonner';

export class AssistantEventHandler {
  private lastResponseContent: string = '';
  private contentPartBuffer: string[] = [];
  private isProcessingResponse: boolean = false;
  private processingPromise: Promise<void> | null = null;
  
  constructor(
    private messageQueue: any,
    private responseParser: ResponseParser
  ) {
    console.log('[AssistantEventHandler] PRIMARY HANDLER Initialized');
  }
  
  handleEvent(event: any): void {
    // Skip if not an assistant event
    if (!EventTypeRegistry.isAssistantEvent(event.type)) {
      return;
    }
    
    console.log(`[AssistantEventHandler] Processing assistant event: ${event.type}`);
    
    // Extract content using our utility function
    const content = extractAssistantContent(event);
    
    // Skip empty content
    if (!content || content.trim() === '') {
      if (event.type === 'response.done' || event.type === 'response.content_part.done') {
        console.log(`[AssistantEventHandler] No content found in ${event.type}, checking for buffered content`);
        
        // If this is a final event, flush any buffered content
        if (this.contentPartBuffer.length > 0) {
          const combinedContent = this.contentPartBuffer.join('');
          this.contentPartBuffer = [];
          
          this.queueAssistantMessage(combinedContent);
        }
      }
      return;
    }
    
    // Handle response.done - this is the complete assistant response
    if (event.type === 'response.done') {
      console.log(`[AssistantEventHandler] Processing FINAL response with ${content.length} chars`);
      
      // Clear any buffered content as we have the full response
      this.contentPartBuffer = [];
      
      // Don't save duplicate content
      if (this.lastResponseContent === content) {
        console.log(`[AssistantEventHandler] Skipping duplicate response content`);
        return;
      }
      
      this.lastResponseContent = content;
      this.queueAssistantMessage(content);
      return;
    }
    
    // Handle content part events - these are partial responses that should be combined
    if (event.type === 'response.content_part.done') {
      console.log(`[AssistantEventHandler] Processing content part with ${content.length} chars`);
      
      // Add to buffer but don't save immediately to avoid duplicate messages
      // We'll save when we get response.done or as a fallback if no response.done arrives
      this.contentPartBuffer.push(content);
      
      toast.info("Processing AI response...", {
        duration: 2000,
      });
    }
  }
  
  // Queue the message with the assistant role
  private queueAssistantMessage(content: string): void {
    if (!content || content.trim() === '') {
      console.log(`[AssistantEventHandler] Skipping empty content`);
      return;
    }
    
    console.log(`[AssistantEventHandler] Queueing ASSISTANT message with ${content.length} chars`);
    
    if (typeof this.messageQueue.queueMessage === 'function') {
      // Explicitly mark as assistant message and set high priority to ensure it's processed
      this.messageQueue.queueMessage('assistant', content, true);
      
      toast.success("AI response received", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 3000
      });
    } else {
      console.error('[AssistantEventHandler] Message queue is missing queueMessage method');
    }
  }
  
  // Flush any pending response when the connection ends
  flushPendingResponse(): void {
    console.log(`[AssistantEventHandler] Flushing any pending response content`);
    
    // If we have buffered content that hasn't been saved yet, save it now
    if (this.contentPartBuffer.length > 0) {
      const combinedContent = this.contentPartBuffer.join('');
      this.contentPartBuffer = [];
      
      if (combinedContent.trim() !== '') {
        this.queueAssistantMessage(combinedContent);
      }
    }
  }
}
