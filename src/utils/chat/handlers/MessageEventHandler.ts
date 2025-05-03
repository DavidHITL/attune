
import { MessageCallback, SaveMessageCallback } from '../../types';
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { UserMessageHandler } from '../user-messages/UserMessageHandler';
import { EventTypeRegistry } from '../events/EventTypeRegistry';

export class MessageEventHandler {
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback,
    private userMessageHandler: UserMessageHandler,
    private transcriptHandler: any // Using any to avoid circular dependency
  ) {}

  handleMessageEvent = (event: any): void => {
    this.messageCallback(event);
    
    // Use the EventTypeRegistry to determine the role - NO DEFAULTS
    const role = EventTypeRegistry.getRoleForEvent(event.type);
    
    if (role === 'assistant') {
      // Process assistant messages
      if (event.type === 'response.done' && event.response?.content) {
        console.log('📬 [MessageEventHandler] Processing ASSISTANT response:', event.response.content.substring(0, 50));
        // CRITICAL FIX: Explicitly pass 'assistant' role
        this.messageQueue.queueMessage('assistant', event.response.content, true);
        return;
      }
      
      // Handle content parts from assistant
      if (event.type === 'response.content_part.done' && event.content_part?.text) {
        console.log('📬 [MessageEventHandler] Processing ASSISTANT content part:', event.content_part.text.substring(0, 50));
        // CRITICAL FIX: Explicitly pass 'assistant' role
        this.messageQueue.queueMessage('assistant', event.content_part.text, true);
        return;
      }
    }
    else if (role === 'user') {
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
    
    console.log(`💾 [MessageEventHandler] saveUserMessage called with: "${content.substring(0, 30)}..."`, {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Queue message with high priority to ensure it's processed even if conversation is initializing
    // Explicitly set role to user since this method is specifically for user messages
    this.messageQueue.queueMessage('user', content, true);
  }
}
