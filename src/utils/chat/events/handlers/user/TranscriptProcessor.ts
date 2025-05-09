
/**
 * Component responsible for processing and saving transcripts
 */
import { MessageQueue } from '../../../messageQueue';
import { TranscriptNotifier } from './TranscriptNotifier';

export class TranscriptProcessor {
  private lastTranscriptContent: string = '';
  private notifier: TranscriptNotifier;
  private processingCount: number = 0;
  
  constructor(private messageQueue: MessageQueue) {
    this.notifier = new TranscriptNotifier();
  }
  
  /**
   * Save a message to the queue with the correct role
   * @param transcriptContent The transcript content to save
   * @param role The role of the message ('user' or 'assistant')
   * @param priority Whether to prioritize this message in the queue
   */
  saveMessage(transcriptContent: string, role: 'user' | 'assistant', priority: boolean = true): void {
    // Validate role to prevent incorrect role assignments
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptProcessor] CRITICAL ERROR: Invalid role: ${role}`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // In TranscriptProcessor within UserEventProcessor, enforce 'user' role
    if (role !== 'user') {
      console.error(`[TranscriptProcessor] Security check: Attempted to save non-user message in user processor`);
      console.log(`[TranscriptProcessor] Forcing role to 'user' for security`);
      role = 'user';
    }
    
    if (!transcriptContent || transcriptContent.trim() === '') {
      return;
    }
    
    this.processingCount++;
    
    // Check if this is identical to the last transcript we processed
    const isDuplicate = this.lastTranscriptContent === transcriptContent;
    
    // Update the last content regardless (we'll save duplicates anyway for reliability)
    this.lastTranscriptContent = transcriptContent;
    
    // Add message to queue with specified priority and role
    console.log(`[TranscriptProcessor] Saving USER message: "${transcriptContent.substring(0, 30)}${transcriptContent.length > 30 ? '...' : ''}"`);
    this.messageQueue.queueMessage(role, transcriptContent, priority);
    
    // Show notification for user feedback (only for user messages)
    if (role === 'user') {
      this.notifier.notifyTranscriptDetection(transcriptContent);
    }
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
