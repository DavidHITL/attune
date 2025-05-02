
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
    
    // CRITICAL: First check if this is new content
    const currentContent = this.accumulator.getAccumulatedText();
    if (currentContent === text) {
      console.log("⚠️ This transcript has already been processed");
      // Still queue to ensure it gets saved
    }
    
    // Queue the message as final transcript (high priority to ensure it's processed)
    console.log(`🔴 Queueing USER message with content: "${text.substring(0, 50)}..."`);
    this.messageQueue.queueMessage('user', text, true);
    
    // Clear the accumulator after processing
    this.accumulator.reset();
  }
}
