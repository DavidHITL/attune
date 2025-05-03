
import { MessageCallback, SaveMessageCallback } from '../../types';
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { UserMessageHandler } from '../user-messages/UserMessageHandler';
import { EventTypeRegistry } from '../events/EventTypeRegistry';
import { getMessageQueue } from '../messageQueue/QueueProvider';

export class MessageEventHandler {
  private processedMessages = new Set<string>();
  
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback,
    private userMessageHandler: UserMessageHandler,
    private transcriptHandler: any // Using any to avoid circular dependency
  ) {
    // Clean up processed messages periodically
    setInterval(() => {
      this.processedMessages.clear();
    }, 300000); // Clear every 5 minutes
  }

  handleMessageEvent = (event: any): void => {
    this.messageCallback(event);
    
    // Skip processing if no type
    if (!event || !event.type) {
      return;
    }
    
    // Use the EventTypeRegistry to determine the role - NO DEFAULTS
    // If explicitRole is set, use that with higher priority
    const messageRole = event.explicitRole || EventTypeRegistry.getRoleForEvent(event.type);
    if (!messageRole) {
      console.log(`📬 [MessageEventHandler] Unknown role for event type: ${event.type}`);
      return;
    }
    
    // Skip if not a valid role
    if (messageRole !== 'user' && messageRole !== 'assistant') {
      console.error(`📬 [MessageEventHandler] Invalid role: ${messageRole}`);
      return;
    }
    
    if (messageRole === 'assistant') {
      // Process assistant messages
      if (event.type === 'response.done' && event.response?.content) {
        const content = event.response.content;
        
        // Generate fingerprint for deduplication
        const contentFingerprint = `assistant:${content.substring(0, 100)}`;
        
        // Skip if we've already processed this content
        if (this.processedMessages.has(contentFingerprint)) {
          console.log('📬 [MessageEventHandler] Skipping duplicate ASSISTANT response');
          return;
        }
        
        // Mark as processed to prevent duplicates
        this.processedMessages.add(contentFingerprint);
        
        console.log('📬 [MessageEventHandler] Processing ASSISTANT response:', content.substring(0, 50));
        
        // Try to get the global message queue first
        const globalMessageQueue = getMessageQueue();
        if (globalMessageQueue) {
          console.log('📬 [MessageEventHandler] Using global message queue');
          // CRITICAL FIX: Explicitly pass 'assistant' role
          globalMessageQueue.queueMessage('assistant', content, true);
        } else {
          console.log('📬 [MessageEventHandler] Using instance message queue');
          // Fall back to the instance queue
          this.messageQueue.queueMessage('assistant', content, true);
        }
        return;
      }
      
      // Handle content parts from assistant
      if (event.type === 'response.content_part.done' && event.content_part?.text) {
        const content = event.content_part.text;
        
        // Generate fingerprint for deduplication
        const contentFingerprint = `assistant:${content.substring(0, 100)}`;
        
        // Skip if we've already processed this content
        if (this.processedMessages.has(contentFingerprint)) {
          console.log('📬 [MessageEventHandler] Skipping duplicate ASSISTANT content part');
          return;
        }
        
        // Mark as processed to prevent duplicates
        this.processedMessages.add(contentFingerprint);
        
        console.log('📬 [MessageEventHandler] Processing ASSISTANT content part:', content.substring(0, 50));
        
        // Try to get the global message queue first
        const globalMessageQueue = getMessageQueue();
        if (globalMessageQueue) {
          // CRITICAL FIX: Explicitly pass 'assistant' role
          globalMessageQueue.queueMessage('assistant', content, true);
        } else {
          // Fall back to the instance queue
          this.messageQueue.queueMessage('assistant', content, true);
        }
        return;
      }
    }
    else if (messageRole === 'user') {
      // Let transcript handler manage user transcripts
      this.transcriptHandler.handleTranscriptEvents(event);
    }
    else {
      console.log(`📬 [MessageEventHandler] Skipping event with unknown role: ${event.type}`);
    }
  }

  saveUserMessage(content: string) {
    if (!content || content.trim() === '') {
      console.log("⚠️ [MessageEventHandler] Skipping empty user message");
      return;
    }
    
    // Generate fingerprint for deduplication
    const contentFingerprint = `user:${content.substring(0, 100)}`;
    
    // Skip if we've already processed this content
    if (this.processedMessages.has(contentFingerprint)) {
      console.log('⚠️ [MessageEventHandler] Skipping duplicate user message');
      return;
    }
    
    // Mark as processed to prevent duplicates
    this.processedMessages.add(contentFingerprint);
    
    console.log(`💾 [MessageEventHandler] saveUserMessage called with: "${content.substring(0, 30)}..."`, {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Try to get the global message queue first
    const globalMessageQueue = getMessageQueue();
    if (globalMessageQueue) {
      console.log('💾 [MessageEventHandler] Using global message queue');
      // Queue message with high priority to ensure it's processed even if conversation is initializing
      // Explicitly set role to user since this method is specifically for user messages
      globalMessageQueue.queueMessage('user', content, true);
    } else {
      console.log('💾 [MessageEventHandler] Using instance message queue');
      // Fall back to the instance queue
      this.messageQueue.queueMessage('user', content, true);
    }
  }
}
