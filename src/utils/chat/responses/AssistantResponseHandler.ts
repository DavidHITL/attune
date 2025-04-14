import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { toast } from 'sonner';

export class AssistantResponseHandler {
  private assistantResponse: string = '';
  private pendingAssistantMessage: boolean = false;
  private lastResponseDelta: number = 0;
  private emptyResponseHandled: boolean = false;
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {}

  handleResponseCreated(): void {
    console.log("Assistant response started, setting pendingAssistantMessage flag");
    this.pendingAssistantMessage = true;
    this.assistantResponse = '';
    this.lastResponseDelta = Date.now();
    this.responseParser.resetBuffer();
    this.emptyResponseHandled = false;
  }
  
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
   * Handle response done events with unified message saving
   */
  handleResponseDone(event: any): void {
    console.log("Response done event received", JSON.stringify(event).substring(0, 200));
    
    let finalContent = this.responseParser.extractCompletedResponseFromDoneEvent(event) || 
                      this.assistantResponse;
      
    if (finalContent && finalContent.trim()) {
      console.log(`Saving assistant response [${finalContent.length} chars]: "${finalContent.substring(0, 50)}${finalContent.length > 50 ? '...' : ''}"`);
      // Use standard queueMessage path with lower priority for assistant messages
      this.messageQueue.queueMessage('assistant', finalContent, false);
    } else if (!this.emptyResponseHandled) {
      console.error("Empty assistant response after done event");
      const defaultMessage = "I'm listening. Could you please continue?";
      this.messageQueue.queueMessage('assistant', defaultMessage, false);
      
      toast.error("Received an empty response from the assistant", {
        description: "This may be due to a temporary issue. Please try again.",
        duration: 4000,
      });
      
      this.emptyResponseHandled = true;
    }
    
    // Reset state
    this.pendingAssistantMessage = false;
    this.assistantResponse = '';
    this.responseParser.clearRawEvents();
  }
  
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
