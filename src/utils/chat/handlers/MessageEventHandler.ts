
import { MessageCallback, SaveMessageCallback } from '../../types';
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { UserMessageHandler } from '../user-messages/UserMessageHandler';

/**
 * @deprecated This handler is completely disabled.
 * MessageEventProcessor with EventDispatcher is now the only handler for all events.
 * 
 * This file is kept only for reference but returns a no-op handler.
 */
export class MessageEventHandler {
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback,
    private userMessageHandler: UserMessageHandler,
    private transcriptHandler: any // Using any to avoid circular dependency
  ) {
    console.warn('[MessageEventHandler] ⚠️ DEPRECATED - Completely disabled - Use MessageEventProcessor with EventDispatcher instead');
  }

  handleMessageEvent = (event: any): void => {
    // No-op - all events are now handled by EventDispatcher through MessageEventProcessor
    console.warn(`[MessageEventHandler] ⚠️ DEPRECATED - This handler is disabled and no longer processes events.`);
    
    // Still pass event to the callback so UI updates work
    // But don't process the event or queue any messages
    this.messageCallback(event);
  }

  saveUserMessage(content: string) {
    console.warn(`[MessageEventHandler] ⚠️ DEPRECATED - saveUserMessage is disabled. All messages should be handled by UserEventHandler.`);
    // No-op - message saving now happens in UserEventHandler
  }
}
