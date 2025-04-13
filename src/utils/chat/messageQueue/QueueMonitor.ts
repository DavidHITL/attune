
import { QueuedMessage } from './types';
import { DetailedQueueStatus } from './QueueTypes';
import { toast } from 'sonner';

/**
 * Monitors queue status and provides reporting functionality
 */
export class QueueMonitor {
  private isProcessingQueue: boolean = false;
  private lastProcessedMessage?: QueuedMessage;
  private lastProcessTime?: number;
  
  constructor(
    private getQueueLength: () => number,
    private getPendingUserMessages: () => number,
    private getActiveSaves: () => number
  ) {}
  
  /**
   * Set processing state
   */
  setProcessingState(isProcessing: boolean): void {
    this.isProcessingQueue = isProcessing;
    
    if (isProcessing) {
      this.lastProcessTime = Date.now();
    }
  }
  
  /**
   * Track processed message
   */
  trackProcessedMessage(message: QueuedMessage): void {
    this.lastProcessedMessage = message;
    this.lastProcessTime = Date.now();
  }
  
  /**
   * Get processing state
   */
  isProcessing(): boolean {
    return this.isProcessingQueue;
  }
  
  /**
   * Get detailed queue status
   */
  getDetailedQueueStatus(): DetailedQueueStatus {
    return {
      queueLength: this.getQueueLength(),
      pendingUserMessages: this.getPendingUserMessages(),
      activeSaves: this.getActiveSaves(),
      isProcessing: this.isProcessingQueue,
      lastProcessedMessageType: this.lastProcessedMessage?.role,
      lastProcessTime: this.lastProcessTime
    };
  }
  
  /**
   * Report queue statistics
   */
  reportQueueStats(): void {
    const stats = this.getDetailedQueueStatus();
    console.log(`Queue stats: ${stats.queueLength} messages, ${stats.pendingUserMessages} pending user messages, ${stats.activeSaves} active saves`);
    
    if (stats.queueLength > 5) {
      toast.info(`Processing ${stats.queueLength} pending messages`, { duration: 2000 });
    }
  }
}
