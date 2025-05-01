
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
  private responseFlushed: boolean = false;
  private isFlushingPendingResponse: boolean = false;
  
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
    
    // Handle response start - reset flags
    if (event.type === 'response.created') {
      this.isProcessingResponse = true;
      this.responseFlushed = false;
      this.contentPartBuffer = [];
      console.log('[AssistantEventHandler] Starting new response processing');
    }
    
    // Skip empty content
    if (!content || content.trim() === '') {
      if (event.type === 'response.done') {
        console.log(`[AssistantEventHandler] Empty content in ${event.type}, checking for buffered content`);
        
        // If this is a final event, flush any buffered content
        this.flushBufferedContentIfNeeded(true); // Force flush for response.done
      }
      return;
    }
    
    // Handle response.done - this is the complete assistant response
    if (event.type === 'response.done') {
      console.log(`[AssistantEventHandler] Processing FINAL response with ${content.length} chars`);
      
      // Don't save duplicate content
      if (this.lastResponseContent === content) {
        console.log(`[AssistantEventHandler] Skipping duplicate response content`);
        return;
      }
      
      // Save the final response and mark as flushed
      this.lastResponseContent = content;
      this.queueAssistantMessage(content);
      this.responseFlushed = true;
      
      // Clear buffer since we have the complete response
      this.contentPartBuffer = [];
      this.isProcessingResponse = false;
      return;
    }
    
    // Handle content part events - buffer these for later use if response.done fails
    if (event.type === 'response.content_part.done') {
      console.log(`[AssistantEventHandler] Buffering content part with ${content.length} chars`);
      
      // Add to buffer but don't save immediately to avoid duplicate messages
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
  
  /**
   * Utility method to flush buffered content if available
   */
  private flushBufferedContentIfNeeded(force: boolean = false): void {
    // Only flush if we have content and either we're forcing a flush or haven't flushed yet
    if (this.contentPartBuffer.length > 0 && (force || !this.responseFlushed)) {
      const combinedContent = this.contentPartBuffer.join('');
      this.contentPartBuffer = []; // Clear buffer
      
      if (combinedContent.trim() !== '') {
        this.queueAssistantMessage(combinedContent);
        this.responseFlushed = true;
      }
    }
  }
  
  /**
   * Flush any pending response when the connection ends
   * This is now coordinated with the MessageEventProcessor
   */
  flushPendingResponse(): void {
    // Prevent recursive flushes
    if (this.isFlushingPendingResponse) {
      console.log('[AssistantEventHandler] Already flushing, skipping duplicate flush');
      return;
    }
    
    try {
      this.isFlushingPendingResponse = true;
      
      // Only flush if we haven't already processed a complete response
      if (this.isProcessingResponse && !this.responseFlushed) {
        console.log(`[AssistantEventHandler] Flushing pending response content`);
        this.flushBufferedContentIfNeeded(true);
      } else {
        console.log('[AssistantEventHandler] No pending content to flush, or response already flushed');
      }
      
      // Reset processing state
      this.isProcessingResponse = false;
    } finally {
      this.isFlushingPendingResponse = false;
    }
  }
}
