
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
    
    const accumulator = this.userMessageHandler.getAccumulatedTranscript();
    if (accumulator && accumulator.length > 15) {
      console.log(`📝 Auto-saving accumulated transcript (${accumulator.length} chars)`);
      this.userMessageHandler.saveTranscriptIfNotEmpty();
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
    
    // Use the message queue for all user message saves
    this.messageQueue.queueMessage('user', content, true);
  }
}
