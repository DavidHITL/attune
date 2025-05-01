
import { toast } from 'sonner';

/**
 * Handles tracking and monitoring message saving state
 */
export class MessageTracker {
  private activeMessageSaves: number = 0;
  private userMessagesPending: Set<string> = new Set();
  
  /**
   * Track start of a message save operation
   */
  trackMessageSaveStart(): void {
    this.activeMessageSaves++;
  }
  
  /**
   * Track completion of a message save operation
   */
  trackMessageSaveComplete(): void {
    if (this.activeMessageSaves > 0) {
      this.activeMessageSaves--;
    }
  }
  
  /**
   * Track a pending user message
   */
  trackPendingUserMessage(messageId: string): void {
    this.userMessagesPending.add(messageId);
  }
  
  /**
   * Remove a pending user message (when save completes)
   */
  removePendingUserMessage(messageId: string): void {
    this.userMessagesPending.delete(messageId);
    console.log(`Remaining pending user messages: ${this.userMessagesPending.size}`);
  }
  
  /**
   * Get current active save count
   */
  getActiveMessageSaves(): number {
    return this.activeMessageSaves;
  }
  
  /**
   * Get pending user messages count
   */
  getPendingUserMessages(): number {
    return this.userMessagesPending.size;
  }
  
  /**
   * Report any pending user messages that never completed
   */
  reportPendingMessages(): void {
    if (this.userMessagesPending.size > 0) {
      console.warn(`WARNING: ${this.userMessagesPending.size} user messages may not have been saved properly`);
      toast.warning(`${this.userMessagesPending.size} user messages may not have been saved`, {
        duration: 3000,
      });
    }
  }
}
