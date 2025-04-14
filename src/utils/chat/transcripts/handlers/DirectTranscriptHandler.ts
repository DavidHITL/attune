
import { MessageQueue } from '../../messageQueue';

export class DirectTranscriptHandler {
  constructor(private messageQueue: MessageQueue) {}

  handleDirectTranscript(transcript: string): void {
    if (!transcript || transcript.trim() === '') {
      console.log("⚠️ Empty direct transcript received, skipping");
      return;
    }

    console.log(`📝 Processing direct transcript: "${transcript.substring(0, 50)}..."`);
    
    // Queue the message with high priority
    this.messageQueue.queueMessage('user', transcript, true);
  }
}
