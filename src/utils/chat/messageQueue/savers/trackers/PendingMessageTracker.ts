
import { toast } from 'sonner';

/**
 * Tracks pending messages and their state
 */
export class PendingMessageTracker {
  private pendingMessages: Set<string> = new Set();
  
  /**
   * Track a pending message
   */
  trackMessage(messageId: string): void {
    this.pendingMessages.add(messageId);
  }
  
  /**
   * Remove a tracked message
   */
  untrackMessage(messageId: string): void {
    this.pendingMessages.delete(messageId);
    console.log(`Remaining pending messages: ${this.pendingMessages.size}`);
  }
  
  /**
   * Get count of pending messages
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }
  
  /**
   * Report any pending messages
   */
  reportPendingMessages(): void {
    if (this.pendingMessages.size > 0) {
      console.warn(`WARNING: ${this.pendingMessages.size} messages may not have been saved properly`);
      toast.warning(`${this.pendingMessages.size} messages may not have been saved`, {
        duration: 3000,
      });
    }
  }
  
  /**
   * Reset pending message tracking
   */
  reset(): void {
    this.pendingMessages.clear();
  }
}
