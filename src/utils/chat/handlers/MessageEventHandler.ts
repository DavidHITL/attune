
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

  handleMessageEvent = (event: any): void {
    // COMPLETELY DISABLED: Direct event processing bypassing EventDispatcher
    console.log(`[MessageEventHandler] DISABLED: All events now process through EventDispatcher: ${event.type}`);
    
    // Just pass the event to the general callback for UI updates
    this.messageCallback(event);
  }

  saveUserMessage(content: string) {
    if (!content || content.trim() === '') {
      console.log("⚠️ [MessageEventHandler] Skipping empty user message");
      return;
    }
    
    console.log(`💾 [MessageEventHandler] Redirecting user message to EventDispatcher path: "${content.substring(0, 30)}..."`);
    
    // Queue message with high priority to ensure it's processed even if conversation is initializing
    // Explicitly set role to user since this method is specifically for user messages
    this.messageQueue.queueMessage('user', content, true);
  }
}
