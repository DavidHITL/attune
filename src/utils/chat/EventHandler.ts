
import { MessageQueue } from './MessageQueue';
import { ResponseParser } from './ResponseParser';
import { MessageCallback } from '../types';

export class EventHandler {
  private userTranscript: string = '';
  private assistantResponse: string = '';
  private pendingAssistantMessage: boolean = false;
  private lastResponseDelta: number = 0;
  private messageQueue: MessageQueue;
  private responseParser: ResponseParser;

  constructor(
    messageQueue: MessageQueue,
    responseParser: ResponseParser,
    private messageCallback: MessageCallback
  ) {
    this.messageQueue = messageQueue;
    this.responseParser = responseParser;
  }

  handleMessage = (event: any): void => {
    // Log and pass the event to the general message callback
    this.responseParser.logEvent(event);
    this.messageCallback(event);
    
    // Mark session as created when we receive that event
    if (event.type === "session.created") {
      console.log("Session created event received");
    }
    
    // Process events for user messages
    if (event.type === "response.audio_transcript.delta" && event.delta?.text) {
      // Accumulate transcript text
      this.userTranscript += event.delta.text;
      console.log(`Accumulating user transcript: ${this.userTranscript}`);
    }
    
    if (event.type === "transcript" && event.transcript) {
      // Handle direct transcript events (high priority user messages)
      console.log("Direct transcript event received:", event.transcript);
      if (event.transcript && event.transcript.trim()) {
        console.log("Saving direct user transcript:", event.transcript);
        this.messageQueue.queueMessage('user', event.transcript);
      }
    }
    
    if (event.type === "response.audio_transcript.done" && event.transcript?.text) {
      // Get the final transcript and save it
      const content = event.transcript.text;
      if (content && content.trim()) {
        console.log("Final user transcript received:", content);
        this.messageQueue.queueMessage('user', content);
        // Reset transcript accumulator
        this.userTranscript = '';
      } else if (this.userTranscript && this.userTranscript.trim()) {
        // Fallback to accumulated transcript if final is missing
        console.log("Using accumulated user transcript:", this.userTranscript);
        this.messageQueue.queueMessage('user', this.userTranscript);
        this.userTranscript = '';
      } else {
        console.log("Empty user transcript, not saving");
      }
    }
    
    this.handleAssistantResponse(event);
  }

  private handleAssistantResponse(event: any): void {
    // Handle assistant response start
    if (event.type === "response.created") {
      console.log("Assistant response started, setting pendingAssistantMessage flag");
      this.pendingAssistantMessage = true;
      this.assistantResponse = '';
      this.lastResponseDelta = Date.now();
      this.responseParser.resetBuffer();
    }
    
    // Handle assistant message content
    if (event.type === "response.delta") {
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
    
    // Handle assistant message completion
    if (event.type === "response.done") {
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
        } else {
          console.error("Failed to construct fallback message");
          // Use a static message as last resort to prevent empty responses
          this.messageQueue.queueMessage('assistant', "I'm listening. Could you please continue?");
        }
      }
      
      // Reset state
      this.pendingAssistantMessage = false;
      this.assistantResponse = '';
      this.responseParser.clearRawEvents();
    }
    
    // Additional handling for edge cases - handle truncated conversations
    if (event.type === "conversation.item.truncated") {
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
    
    // Handle finalized content parts that might contain the full response
    if (event.type === "response.content_part.done" && event.content) {
      console.log("Content part done event received with content");
      
      if (this.pendingAssistantMessage && (!this.assistantResponse || this.assistantResponse.trim() === '')) {
        if (typeof event.content === 'string' && event.content.trim()) {
          console.log("Using content from content_part.done:", event.content.substring(0, 30) + "...");
          this.assistantResponse = event.content;
        }
      }
    }
  }

  // For cleanup - save any pending messages
  flushPendingMessages(): void {
    // If there's a pending assistant message, save it
    if (this.pendingAssistantMessage && this.assistantResponse && this.assistantResponse.trim()) {
      console.log("Saving pending assistant response during disconnect:", this.assistantResponse.substring(0, 30) + "...");
      this.messageQueue.queueMessage('assistant', this.assistantResponse);
    } else if (this.pendingAssistantMessage && Date.now() - this.lastResponseDelta > 5000) {
      // If we haven't received response deltas for 5+ seconds but have a pending message flag
      console.warn("Pending assistant message with no content and no recent deltas during disconnect");
      
      // Try to use a fallback method to get a message
      const fallback = this.responseParser.constructFallbackMessage();
      if (fallback) {
        console.log("Using fallback method for pending message:", fallback.substring(0, 30) + "...");
        this.messageQueue.queueMessage('assistant', fallback);
      } else {
        // Use a static message as last resort
        this.messageQueue.queueMessage('assistant', "I'm listening. How can I help you?");
      }
    }

    // Save any partial transcripts that weren't saved yet
    if (this.userTranscript && this.userTranscript.trim()) {
      console.log("Saving partial user transcript during disconnect:", this.userTranscript);
      this.messageQueue.queueMessage('user', this.userTranscript);
    }
  }
}
