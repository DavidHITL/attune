
/**
 * Component responsible for processing and saving transcripts
 */
import { MessageQueue } from '../../../messageQueue';
import { TranscriptNotifier } from './TranscriptNotifier';

export class TranscriptProcessor {
  private lastTranscriptContent: string = '';
  private notifier: TranscriptNotifier;
  
  constructor(private messageQueue: MessageQueue) {
    this.notifier = new TranscriptNotifier();
  }
  
  /**
   * Save a user message to the queue
   */
  saveUserMessage(transcriptContent: string, role: 'user' | 'assistant'): void {
    this.lastTranscriptContent = transcriptContent;
    
    console.log(`[TranscriptProcessor] Saving transcript: "${transcriptContent.substring(0, 50)}..."`, {
      contentLength: transcriptContent.length,
      timestamp: new Date().toISOString(),
      role
    });
    
    // Add message to queue with highest priority
    this.messageQueue.queueMessage(role, transcriptContent, true);
    
    // Show notification for user feedback
    this.notifier.notifyTranscriptDetection(transcriptContent);
  }
  
  /**
   * Check if content is duplicate of last saved transcript
   */
  isDuplicate(content: string): boolean {
    return this.lastTranscriptContent === content;
  }
  
  /**
   * Get the last saved transcript
   */
  getLastTranscript(): string {
    return this.lastTranscriptContent;
  }
}
