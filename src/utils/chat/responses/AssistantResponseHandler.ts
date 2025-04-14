
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { toast } from 'sonner';

/**
 * Handles capturing and processing assistant responses
 */
export class AssistantResponseHandler {
  private assistantResponse: string = '';
  private pendingAssistantMessage: boolean = false;
  private lastResponseDelta: number = 0;
  private emptyResponseHandled: boolean = false;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {}

  /**
   * Handle response created events
   */
  handleResponseCreated(): void {
    console.log("Assistant response started, setting pendingAssistantMessage flag");
    this.pendingAssistantMessage = true;
    this.assistantResponse = '';
    this.lastResponseDelta = Date.now();
    this.responseParser.resetBuffer();
    this.emptyResponseHandled = false;
  }
  
  /**
   * Handle response delta events
   */
  handleResponseDelta(event: any): void {
    this.lastResponseDelta = Date.now();
    let extractedContent = this.responseParser.extractContentFromDelta(event);
    
    if (extractedContent) {
      console.log(`Extracted content from delta: "${extractedContent.substring(0, 30)}${extractedContent.length > 30 ? '...' : ''}"`);
      if (this.pendingAssistantMessage) {
        this.assistantResponse += extractedContent;
        console.log(`Updated assistant response (${this.assistantResponse.length} chars): "${this.assistantResponse.substring(0, 50)}${this.assistantResponse.length > 50 ? '...' : ''}"`);
      } else {
        console.log("Received content delta without pending message flag. Setting flag now.");
        this.pendingAssistantMessage = true;
        this.assistantResponse = extractedContent;
      }
    } else {
      console.log("Response delta received but couldn't extract content:", JSON.stringify(event).substring(0, 200));
    }
  }
  
  /**
   * Handle response done events
   */
  handleResponseDone(event: any): void {
    console.log("Response done event received", JSON.stringify(event).substring(0, 200));
    
    // Extract final message from response.done event if possible
    let finalResponse = this.responseParser.extractCompletedResponseFromDoneEvent(event);
    
    // Use extracted response or fallback to accumulated response
    let finalContent = finalResponse && finalResponse.trim() 
      ? finalResponse 
      : this.assistantResponse;
      
    if (finalContent && finalContent.trim()) {
      console.log(`Saving assistant response [${finalContent.length} chars]: "${finalContent.substring(0, 50)}${finalContent.length > 50 ? '...' : ''}"`);
      this.messageQueue.queueMessage('assistant', finalContent);
    } else {
      console.error("Empty assistant response after done event. Response events:", 
        JSON.stringify(this.responseParser.getEventLog().slice(-10)));
      
      // Emergency fallback - try to construct a message from the last few events
      const fallbackMessage = this.responseParser.constructFallbackMessage();
      if (fallbackMessage) {
        console.log(`Using fallback message construction: "${fallbackMessage}"`);
        this.messageQueue.queueMessage('assistant', fallbackMessage);
      } else if (!this.emptyResponseHandled) {
        console.error("Empty assistant response after done event");
        
        // Use a static message as last resort to prevent empty responses
        const defaultMessage = "I'm listening. Could you please continue?";
        console.log(`Using default message: "${defaultMessage}"`);
        this.messageQueue.queueMessage('assistant', defaultMessage);
        
        // Show toast notification about empty response
        toast.error("Received an empty response from the assistant", {
          description: "This may be due to a temporary issue. Please try again.",
          duration: 4000,
        });
        
        this.emptyResponseHandled = true;
      }
    }
    
    // Reset state
    this.pendingAssistantMessage = false;
    this.assistantResponse = '';
    this.responseParser.clearRawEvents();
  }
  
  /**
   * Handle conversation item truncated events
   */
  handleConversationTruncated(): void {
    console.log("Conversation item truncated event received");
    
    // Check if we have a pending message that hasn't been saved yet
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving truncated assistant response:", this.assistantResponse.substring(0, 30) + "...");
      this.messageQueue.queueMessage('assistant', this.assistantResponse);
      
      // Reset state
      this.pendingAssistantMessage = false;
      this.assistantResponse = '';
    }
  }
  
  /**
   * Handle content part done events
   */
  handleContentPartDone(content: any): void {
    console.log("Content part done event received with content");
    
    if (this.pendingAssistantMessage && (!this.assistantResponse || this.assistantResponse.trim() === '')) {
      if (typeof content === 'string' && content.trim()) {
        console.log("Using content from content_part.done:", content.substring(0, 30) + "...");
        this.assistantResponse = content;
      }
    }
  }
  
  /**
   * For cleanup - save any pending assistant response
   */
  flushPendingResponse(): void {
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving pending assistant response during disconnect:", this.assistantResponse.substring(0, 30) + "...");
      this.messageQueue.queueMessage('assistant', this.assistantResponse);
    }
  }
}
