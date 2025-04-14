
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
    console.log("Assistant response started");
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
      } else {
        this.pendingAssistantMessage = true;
        this.assistantResponse = extractedContent;
      }
    }
  }
  
  handleResponseDone(event: any): void {
    console.log("Response done event received");
    
    let finalContent = this.responseParser.extractCompletedResponseFromDoneEvent(event) || 
                      this.assistantResponse;
      
    if (finalContent && finalContent.trim()) {
      console.log(`Queueing assistant response [${finalContent.length} chars]`);
      this.messageQueue.queueMessage('assistant', finalContent, false);
    } else if (!this.emptyResponseHandled) {
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
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving truncated assistant response");
      this.messageQueue.queueMessage('assistant', this.assistantResponse, false);
      
      this.pendingAssistantMessage = false;
      this.assistantResponse = '';
    }
  }
  
  handleContentPartDone(content: any): void {
    if (this.pendingAssistantMessage && (!this.assistantResponse || this.assistantResponse.trim() === '')) {
      if (typeof content === 'string' && content.trim()) {
        this.assistantResponse = content;
      }
    }
  }
  
  flushPendingResponse(): void {
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving pending assistant response during disconnect");
      this.messageQueue.queueMessage('assistant', this.assistantResponse, false);
    }
  }
}
