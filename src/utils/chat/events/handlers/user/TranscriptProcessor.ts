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
  private missedTranscriptCount: number = 0;
  private saveDeduplicationMap: Map<string, number> = new Map();
  
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
    
    // Safety check: force role to be correct
    if (role !== 'user' && role !== 'assistant') {
      console.warn(`[TranscriptProcessor ${this.debugId}] Invalid role: ${role}, forcing to 'user'`);
      role = 'user';
    }
    
    this.processingCount++;
    const processId = this.processingCount;
    
    // Create a hash for deduplication - combine first 10 chars with length and last 5 chars
    const transcriptHash = `${transcriptContent.substring(0, 10)}-${transcriptContent.length}-${transcriptContent.substring(transcriptContent.length - 5)}`;
    const isDuplicate = this.saveDeduplicationMap.has(transcriptHash);
    const timeSinceLast = isDuplicate ? 
      Date.now() - (this.saveDeduplicationMap.get(transcriptHash) || 0) : 
      Infinity;
    
    // Update the hash timestamp regardless
    this.saveDeduplicationMap.set(transcriptHash, Date.now());
    
    // Clean up old hashes to prevent memory leaks
    if (this.saveDeduplicationMap.size > 100) {
      // Keep only the 50 most recent hashes
      const entries = Array.from(this.saveDeduplicationMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      this.saveDeduplicationMap = new Map(entries);
    }
    
    // Check if this is identical to the last transcript we processed
    const isExactDuplicate = this.lastTranscriptContent === transcriptContent;
    
    // Update the last content regardless
    this.lastTranscriptContent = transcriptContent;
    
    console.log(`[TranscriptProcessor ${this.debugId}] #${processId} Saving transcript: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`, {
      contentLength: transcriptContent.length,
      wordCount: transcriptContent.trim().split(/\s+/).length,
      timestamp: new Date().toISOString(),
      role,
      priority,
      isDuplicate,
      isExactDuplicate,
      timeSinceLast: isExactDuplicate ? timeSinceLast : 'N/A',
      processId
    });
    
    // Skip if it's a duplicate that was processed very recently (within 2 seconds)
    if (isDuplicate && timeSinceLast < 2000) {
      console.log(`[TranscriptProcessor ${this.debugId}] #${processId} Skipping recent duplicate transcript (${timeSinceLast}ms ago)`);
      this.missedTranscriptCount--;
      return;
    }
    
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
   * Track missed transcript
   */
  trackMissedTranscript(): void {
    this.missedTranscriptCount++;
    console.warn(`[TranscriptProcessor ${this.debugId}] Missed transcript count: ${this.missedTranscriptCount}`);
  }
  
  /**
   * Get debug information about the processor state
   */
  getDebugInfo(): object {
    return {
      id: this.debugId,
      processingCount: this.processingCount,
      missedTranscriptCount: this.missedTranscriptCount,
      lastTranscriptLength: this.lastTranscriptContent.length,
      lastTranscriptPreview: this.lastTranscriptContent 
        ? this.lastTranscriptContent.substring(0, 50) + (this.lastTranscriptContent.length > 50 ? '...' : '')
        : '(empty)',
      deduplicationMapSize: this.saveDeduplicationMap.size
    };
  }
}
