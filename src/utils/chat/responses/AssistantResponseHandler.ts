
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { toast } from 'sonner';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class AssistantResponseHandler {
  private assistantResponse: string = '';
  private pendingAssistantMessage: boolean = false;
  private lastResponseDelta: number = 0;
  private emptyResponseHandled: boolean = false;
  private processedResponses = new Set<string>();
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser
  ) {
    // Clean up processed responses cache periodically
    setInterval(() => {
      this.processedResponses.clear();
    }, 300000); // Clear every 5 minutes
  }

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
  
  extractCompletedResponseFromEvent(event: any): string | null {
    // Try to get the full completed response from the event
    const finalContent = this.responseParser.extractCompletedResponseFromDoneEvent(event) || 
                         this.assistantResponse;
                         
    return finalContent && finalContent.trim() ? finalContent : null;
  }
  
  handleResponseDone(event: any): void {
    console.log("Response done event received");
    
    const finalContent = this.extractCompletedResponseFromEvent(event);
      
    if (finalContent) {
      // Generate fingerprint for deduplication
      const contentFingerprint = `response:${finalContent.substring(0, 100)}`;
      
      // Skip if we've already processed this exact response
      if (this.processedResponses.has(contentFingerprint)) {
        console.log(`[AssistantResponseHandler] Skipping duplicate response`);
        return;
      }
      
      // Mark as processed to prevent duplicates
      this.processedResponses.add(contentFingerprint);
      
      // First try to use the global message queue for single source of truth
      const globalMessageQueue = getMessageQueue();
      if (globalMessageQueue) {
        console.log(`Routing assistant response to global queue [${finalContent.length} chars]`);
        // CRITICAL: Force the role to be 'assistant'
        globalMessageQueue.queueMessage('assistant', finalContent, true);
      } else {
        // Fall back to the instance queue if global not available
        console.log(`Queueing assistant response through instance queue [${finalContent.length} chars]`);
        this.messageQueue.queueMessage('assistant', finalContent, false);
      }
    } else if (!this.emptyResponseHandled) {
      const defaultMessage = "I'm listening. Could you please continue?";
      
      // First try to use the global message queue
      const globalMessageQueue = getMessageQueue();
      if (globalMessageQueue) {
        globalMessageQueue.queueMessage('assistant', defaultMessage, true);
      } else {
        // Fall back to the instance queue
        this.messageQueue.queueMessage('assistant', defaultMessage, false);
      }
      
      toast.error("Received an empty response from the assistant", {
        description: "This may be due to a temporary issue. Please try again.",
        duration: 4000,
      });
      
      this.emptyResponseHandled = true;
    }
    
    this.pendingAssistantMessage = false;
    this.assistantResponse = '';
    this.responseParser.clearRawEvents();
  }
  
  handleContentPartDone(content: any): void {
    const contentText = typeof content === 'string' ? content : 
                      (content?.text || content?.value || '');
                      
    if (this.pendingAssistantMessage && (!this.assistantResponse || this.assistantResponse.trim() === '')) {
      if (contentText && contentText.trim()) {
        this.assistantResponse = contentText;
      }
    }
    
    if (contentText && contentText.trim()) {
      // Generate fingerprint for deduplication
      const contentFingerprint = `content_part:${contentText.substring(0, 100)}`;
      
      // Skip if we've already processed this exact content part
      if (this.processedResponses.has(contentFingerprint)) {
        console.log(`[AssistantResponseHandler] Skipping duplicate content part`);
        return;
      }
      
      // Mark as processed to prevent duplicates
      this.processedResponses.add(contentFingerprint);
      
      // Try global queue first
      const globalMessageQueue = getMessageQueue();
      if (globalMessageQueue) {
        console.log(`[AssistantResponseHandler] Routing content part to global queue: "${contentText.substring(0, 30)}..."`);
        // CRITICAL: Force the role to be 'assistant'
        globalMessageQueue.queueMessage('assistant', contentText, true);
      }
    }
  }

  handleConversationTruncated(): void {
    console.log("Conversation truncated event received");
    if (this.pendingAssistantMessage && this.assistantResponse) {
      console.log("Saving pending assistant message due to conversation truncation");
      
      // Try global queue first
      const globalMessageQueue = getMessageQueue();
      if (globalMessageQueue) {
        globalMessageQueue.queueMessage('assistant', this.assistantResponse, true);
      } else {
        // Fall back to instance queue
        this.messageQueue.queueMessage('assistant', this.assistantResponse, true);
      }
      
      this.pendingAssistantMessage = false;
      this.assistantResponse = '';
    }
  }

  flushPendingResponse(): void {
    console.log("Flushing any pending assistant response");
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log(`Flushing pending assistant response [${this.assistantResponse.length} chars]`);
      
      // Try global queue first
      const globalMessageQueue = getMessageQueue();
      if (globalMessageQueue) {
        globalMessageQueue.queueMessage('assistant', this.assistantResponse, true);
      } else {
        // Fall back to instance queue
        this.messageQueue.queueMessage('assistant', this.assistantResponse, true);
      }
      
      this.pendingAssistantMessage = false;
      this.assistantResponse = '';
    }
  }
}
