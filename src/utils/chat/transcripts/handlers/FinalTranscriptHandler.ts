
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
    
    // Queue the message with normal priority since it's a final transcript
    this.messageQueue.queueMessage('user', text, false);
    
    // Clear the accumulator after processing
    this.accumulator.reset();
  }
}
