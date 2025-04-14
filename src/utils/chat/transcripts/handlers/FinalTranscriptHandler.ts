
import { MessageQueue } from '../../messageQueue';
import { DuplicateTracker } from './DuplicateTracker';
import { TranscriptNotifier } from './TranscriptNotifier';
import { TranscriptAccumulator } from './TranscriptAccumulator';

export class FinalTranscriptHandler {
  private duplicateTracker: DuplicateTracker;
  private notifier: TranscriptNotifier;

  constructor(
    private messageQueue: MessageQueue,
    private accumulator: TranscriptAccumulator
  ) {
    this.duplicateTracker = new DuplicateTracker();
    this.notifier = new TranscriptNotifier();
  }

  handleFinalTranscript(text: string | undefined): void {
    console.log("🔍 HANDLING FINAL TRANSCRIPT:", text);
    
    const content = text;
    
    if (content && content.trim()) {
      if (this.duplicateTracker.isDuplicate(content)) {
        console.log("Duplicate final transcript detected, skipping:", content.substring(0, 50));
        return;
      }
      
      console.log("🔴 FINAL TRANSCRIPT SAVING:", content);
      
      this.messageQueue.queueMessage('user', content, true);
      this.duplicateTracker.markAsProcessed(content);
      
      this.accumulator.reset();
      this.notifier.notifyTranscriptSaved(content);
    } else if (this.accumulator.getAccumulatedText().trim()) {
      const accumulatedText = this.accumulator.getAccumulatedText();
      console.log("🔴 USING ACCUMULATED TRANSCRIPT:", accumulatedText);
      
      if (!this.duplicateTracker.isDuplicate(accumulatedText)) {
        this.messageQueue.queueMessage('user', accumulatedText, true);
        this.duplicateTracker.markAsProcessed(accumulatedText);
        this.notifier.notifyTranscriptSaved(accumulatedText, "accumulated");
      }
      
      this.accumulator.reset();
    } else {
      console.log("Empty user transcript, not saving");
    }
    
    this.duplicateTracker.cleanup();
  }
}
