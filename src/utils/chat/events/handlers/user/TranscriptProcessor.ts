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
  private lastSuccessfullySavedContent: string = '';
  private pendingSaves: Map<string, {content: string, timestamp: number}> = new Map();
  private safetyTimeoutId: number | null = null;
  private maxSaveAttempts: number = 3;
  
  constructor(private messageQueue: MessageQueue) {
    this.notifier = new TranscriptNotifier();
    this.debugId = `TP-${Date.now().toString(36)}`;
    console.log(`[TranscriptProcessor ${this.debugId}] Initialized`);
    
    // Set up safety check interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkPendingSaves(), 5000);
    }
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
    const saveId = `save-${Date.now().toString(36)}-${processId}`;
    
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
      processId,
      saveId
    });
    
    // Track this save attempt
    this.pendingSaves.set(saveId, {
      content: transcriptContent,
      timestamp: Date.now()
    });
    
    // Add message to queue with specified priority
    this.messageQueue.queueMessage(role, transcriptContent, priority);
    
    // Schedule a safety timeout to ensure the message is saved
    this.scheduleSafetyTimeout(saveId, transcriptContent, role);
    
    // Show notification for user feedback
    this.notifier.notifyTranscriptDetection(transcriptContent);
    
    // Log successful processing
    console.log(`[TranscriptProcessor ${this.debugId}] #${processId} Successfully queued ${role} transcript (${transcriptContent.length} chars)`, {
      timestamp: new Date().toISOString(),
      processId,
      saveCount: this.processingCount,
      saveId
    });
  }
  
  /**
   * Schedule a safety timeout to ensure a message is saved
   */
  private scheduleSafetyTimeout(saveId: string, content: string, role: 'user' | 'assistant'): void {
    if (typeof window !== 'undefined') {
      const timeoutId = window.setTimeout(() => {
        if (this.pendingSaves.has(saveId)) {
          console.log(`[TranscriptProcessor ${this.debugId}] Safety timeout triggered for save ${saveId}`);
          
          // Force save directly with highest priority
          this.messageQueue.queueMessage(role, content, true);
          
          // Mark as processed but keep in pending to track multiple attempts
          const pendingSave = this.pendingSaves.get(saveId);
          if (pendingSave) {
            pendingSave.timestamp = Date.now(); // Update timestamp for next retry check
          }
        }
      }, 3000);
      
      // Store timeout ID if needed for cleanup
      this.safetyTimeoutId = timeoutId as unknown as number;
    }
  }
  
  /**
   * Periodically check for pending saves that haven't been processed
   */
  private checkPendingSaves(): void {
    const now = Date.now();
    let retriedCount = 0;
    
    // Check all pending saves
    this.pendingSaves.forEach((save, saveId) => {
      const ageMs = now - save.timestamp;
      
      // If a save is older than 10 seconds, try to save it again
      if (ageMs > 10000) {
        console.log(`[TranscriptProcessor ${this.debugId}] Found stale pending save ${saveId} (${ageMs}ms old)`);
        
        // Force save with highest priority
        this.messageQueue.queueMessage('user', save.content, true);
        
        // Update timestamp or remove if too many attempts
        const attemptCount = Math.floor(ageMs / 10000);
        if (attemptCount > this.maxSaveAttempts) {
          console.log(`[TranscriptProcessor ${this.debugId}] Maximum retry attempts reached for save ${saveId}, removing from tracking`);
          this.pendingSaves.delete(saveId);
        } else {
          save.timestamp = now;
          retriedCount++;
        }
      }
    });
    
    if (retriedCount > 0) {
      console.log(`[TranscriptProcessor ${this.debugId}] Retried ${retriedCount} pending saves`);
    }
    
    // Report statistics
    if (this.pendingSaves.size > 0) {
      console.log(`[TranscriptProcessor ${this.debugId}] Currently tracking ${this.pendingSaves.size} pending saves`);
    }
  }
  
  /**
   * Mark a save as successfully completed
   */
  markSaveCompleted(content: string): void {
    this.lastSuccessfullySavedContent = content;
    
    // Remove any pending saves with this content
    let removed = 0;
    this.pendingSaves.forEach((save, saveId) => {
      if (save.content === content) {
        this.pendingSaves.delete(saveId);
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`[TranscriptProcessor ${this.debugId}] Marked ${removed} pending saves as completed`);
    }
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
   * Get the last successfully saved transcript
   */
  getLastSuccessfullySavedTranscript(): string {
    return this.lastSuccessfullySavedContent;
  }
  
  /**
   * Force resave any pending content
   */
  forceSavePendingContent(): void {
    const pendingCount = this.pendingSaves.size;
    if (pendingCount > 0) {
      console.log(`[TranscriptProcessor ${this.debugId}] Force saving ${pendingCount} pending transcripts`);
      
      // Create an array from the map to avoid modification during iteration
      Array.from(this.pendingSaves.entries()).forEach(([saveId, save], index) => {
        console.log(`[TranscriptProcessor ${this.debugId}] Force saving transcript #${index+1}/${pendingCount} (${save.content.length} chars): "${save.content.substring(0, 30)}..."`);
        this.messageQueue.queueMessage('user', save.content, true);
      });
    }
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
        : '(empty)',
      pendingSaves: this.pendingSaves.size,
      lastSuccessfullySavedContentLength: this.lastSuccessfullySavedContent.length
    };
  }
}
