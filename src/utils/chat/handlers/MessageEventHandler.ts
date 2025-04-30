
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
    // DISABLED: Direct event processing bypassing EventDispatcher
    console.log(`[MessageEventHandler] DEPRECATED: Use EventDispatcher instead. Event: ${event.type}`);
    
    // Just pass the event to the general callback
    this.messageCallback(event);
    
    // NOTE: No longer processing events here - all routing happens in EventDispatcher
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
