
import { Message } from '../../../../types';
import { ProcessedMessagesTracker } from '../utils/ProcessedMessagesTracker';

/**
 * Abstract strategy for saving messages
 */
export abstract class SaveStrategy {
  protected contentProcessor: ProcessedMessagesTracker;
  
  constructor() {
    // Fix: Remove incorrect constructor argument
    this.contentProcessor = new ProcessedMessagesTracker();
  }
  
  /**
   * Save a message using strategy-specific logic
   */
  abstract saveMessage(
    role: 'user' | 'assistant', 
    content: string, 
    options?: any
  ): Promise<Message | null>;
  
  /**
   * Reset processed messages tracker for this strategy
   */
  resetProcessedTracking(): void {
    // Make sure we're calling a method that exists on ProcessedMessagesTracker
    this.contentProcessor.reset();
  }
  
  /**
   * Get the pending count
   */
  abstract getPendingCount(): number;

  /**
   * Get active saves count
   */
  abstract getActiveSavesCount(): number;
}
