
import { toast } from 'sonner';

/**
 * Tracks message saving state
 */
export class MessageTracker {
  private pendingMessages = new Set<string>();
  private activeSaves = 0;
  
  /**
   * Start tracking a message
   */
  trackMessage(messageId: string): void {
    this.pendingMessages.add(messageId);
  }
  
  /**
   * Stop tracking a message
   */
  untrackMessage(messageId: string): void {
    this.pendingMessages.delete(messageId);
  }
  
  /**
   * Get count of pending messages
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }
  
  /**
   * Increment active saves counter
   */
  incrementActiveSaves(): void {
    this.activeSaves++;
  }
  
  /**
   * Decrement active saves counter
   */
  decrementActiveSaves(): void {
    if (this.activeSaves > 0) {
      this.activeSaves--;
    }
  }
  
  /**
   * Get current active save count
   */
  getActiveSavesCount(): number {
    return this.activeSaves;
  }
  
  /**
   * Report any pending messages that never completed
   */
  reportPendingMessages(): void {
    if (this.pendingMessages.size > 0) {
      console.warn(`There are ${this.pendingMessages.size} pending messages that were never completed`);
      console.warn(`Pending message IDs: ${Array.from(this.pendingMessages).join(', ')}`);
      
      toast.warning(`${this.pendingMessages.size} messages may not have been saved properly`, {
        duration: 3000,
      });
    }
  }
}
