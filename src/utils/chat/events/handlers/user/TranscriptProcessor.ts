
/**
 * Component responsible for processing and saving transcripts
 */
import { MessageQueue } from '../../../messageQueue';
import { TranscriptNotifier } from './TranscriptNotifier';

export class TranscriptProcessor {
  private lastTranscriptContent: string = '';
  private notifier: TranscriptNotifier;
  private processingCount: number = 0;
  private debugId: string;
  
  constructor(private messageQueue: MessageQueue) {
    this.notifier = new TranscriptNotifier();
    this.debugId = `TP-${Date.now().toString(36)}`;
    console.log(`[TranscriptProcessor ${this.debugId}] Initialized`);
  }
  
  /**
   * Save a user message to the queue
   * @param transcriptContent The transcript content to save
   * @param role The role of the message ('user' or 'assistant')
   * @param priority Whether to prioritize this message in the queue
   */
  saveUserMessage(transcriptContent: string, role: 'user' | 'assistant', priority: boolean = true): void {
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[TranscriptProcessor ${this.debugId}] Skipping empty transcript`);
      return;
    }
    
    this.processingCount++;
    const processId = this.processingCount;
    
    // Check if this is identical to the last transcript we processed
    const isDuplicate = this.lastTranscriptContent === transcriptContent;
    
    // Update the last content regardless (we'll save duplicates anyway for reliability)
    this.lastTranscriptContent = transcriptContent;
    
    console.log(`[TranscriptProcessor ${this.debugId}] #${processId} Saving transcript: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`, {
      contentLength: transcriptContent.length,
      wordCount: transcriptContent.trim().split(/\s+/).length,
      timestamp: new Date().toISOString(),
      role,
      priority,
      isDuplicate,
      processId
    });
    
    // Add message to queue with specified priority
    this.messageQueue.queueMessage(role, transcriptContent, priority);
    
    // Show notification for user feedback
    this.notifier.notifyTranscriptDetection(transcriptContent);
    
    // Log successful processing
    console.log(`[TranscriptProcessor ${this.debugId}] #${processId} Successfully queued ${role} transcript (${transcriptContent.length} chars)`, {
      timestamp: new Date().toISOString(),
      processId,
      saveCount: this.processingCount
    });
  }
  
  /**
   * Check if content is duplicate of last saved transcript
   */
  isDuplicate(content: string): boolean {
    const duplicate = this.lastTranscriptContent === content;
    if (duplicate) {
      console.log(`[TranscriptProcessor ${this.debugId}] Detected duplicate transcript: "${content.substring(0, 30)}..."`);
    }
    return duplicate;
  }
  
  /**
   * Get the last saved transcript
   */
  getLastTranscript(): string {
    return this.lastTranscriptContent;
  }
  
  /**
   * Get debug information about the processor state
   */
  getDebugInfo(): object {
    return {
      id: this.debugId,
      processingCount: this.processingCount,
      lastTranscriptLength: this.lastTranscriptContent.length,
      lastTranscriptPreview: this.lastTranscriptContent 
        ? this.lastTranscriptContent.substring(0, 50) + (this.lastTranscriptContent.length > 50 ? '...' : '')
        : '(empty)'
    };
  }
}
