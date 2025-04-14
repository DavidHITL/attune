
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {}

  handleFinalTranscript(text: string | undefined): void {
    if (!text || text.trim() === '') {
      console.log("⚠️ Empty final transcript received, skipping");
      return;
    }

    console.log(`📝 Processing final transcript: "${text.substring(0, 50)}..."`);
    
    // Queue the message as final transcript (high priority to ensure it's processed)
    this.messageQueue.queueMessage('user', text, true);
    
    // Clear the accumulator after processing
    this.accumulator.reset();
  }
}
