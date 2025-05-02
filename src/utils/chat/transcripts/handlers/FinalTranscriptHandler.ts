
import { MessageQueue } from '../../messageQueue';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  private lastSavedTranscript: string = '';
  private processingCount: number = 0;
  
  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {}

  handleFinalTranscript(text: string | undefined): void {
    if (!text || text.trim() === '') {
      console.log("⚠️ Empty final transcript received, skipping");
      return;
    }

    this.processingCount++;
    const currentCount = this.processingCount;
    console.log(`📝[${currentCount}] Processing final transcript: "${text.substring(0, 50)}..."`);
    
    // IMPROVED: Always queue the message, even if it's a duplicate of the last one
    // During connection issues, it's better to have duplicates than missing content
    console.log(`🔴[${currentCount}] Queueing USER message with content: "${text.substring(0, 50)}..."`);
    
    // Add high priority flag to ensure it's processed quickly
    this.messageQueue.queueMessage('user', text, true);
    
    // Update last saved content
    this.lastSavedTranscript = text;
    
    // Clear the accumulator after processing
    this.accumulator.reset();
    console.log(`✅[${currentCount}] Transcript processed and accumulator reset`);
  }
}
