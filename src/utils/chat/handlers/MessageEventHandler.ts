
import { MessageCallback, SaveMessageCallback } from '../../types';
import { MessageQueue } from '../messageQueue';
import { ResponseParser } from '../ResponseParser';
import { UserMessageHandler } from '../user-messages/UserMessageHandler';
import { TranscriptEventHandler } from '../events/TranscriptEventHandler';

export class MessageEventHandler {
  constructor(
    private messageQueue: MessageQueue,
    private responseParser: ResponseParser,
    private messageCallback: MessageCallback,
    private userMessageHandler: UserMessageHandler,
    private transcriptHandler: TranscriptEventHandler
  ) {}

  handleMessageEvent = (event: any): void => {
    this.messageCallback(event);
    this.transcriptHandler.handleTranscriptEvents(event);
    
    // Get accumulated transcript length for debugging only
    const accumulator = this.userMessageHandler.getAccumulatedTranscript();
    if (accumulator && accumulator.length > 0) {
      console.log(`📝 Current transcript length: ${accumulator.length} chars`);
    }
  }

  saveUserMessage(content: string) {
    if (!content || content.trim() === '') {
      console.log("⚠️ Skipping empty user message");
      return;
    }
    
    console.log(`💾 MessageEventHandler.saveUserMessage called with: "${content.substring(0, 30)}..."`, {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Queue message with high priority to ensure it's processed even if conversation is initializing
    // CRITICAL FIX: Explicitly set role to user since this method is specifically for user messages
    this.messageQueue.queueMessage('user', content, true);
  }
}
