
import { MessageQueue } from '../../messageQueue';
import { DuplicateTracker } from './DuplicateTracker';
import { TranscriptNotifier } from './TranscriptNotifier';

export class DirectTranscriptHandler {
  private duplicateTracker: DuplicateTracker;
  private notifier: TranscriptNotifier;

  constructor(private messageQueue: MessageQueue) {
    this.duplicateTracker = new DuplicateTracker();
    this.notifier = new TranscriptNotifier();
  }

  handleDirectTranscript(transcript: string): void {
    if (transcript && transcript.trim()) {
      if (this.duplicateTracker.isDuplicate(transcript)) {
        console.log("Duplicate transcript detected, skipping:", transcript.substring(0, 50));
        return;
      }

      console.log("🔴 DIRECT TRANSCRIPT DETECTED:", transcript.substring(0, 100));
      
      this.messageQueue.queueMessage('user', transcript, true);
      this.duplicateTracker.markAsProcessed(transcript);
      
      this.notifier.notifyTranscriptCaptured(transcript);
    }
  }
}
