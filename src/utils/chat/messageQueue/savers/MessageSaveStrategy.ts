
import { Message } from '../../../types';
import { ProcessedMessagesTracker } from './utils/ProcessedMessagesTracker';

/**
 * Strategy for saving messages
 */
export class MessageSaveStrategy {
  protected contentProcessor: ProcessedMessagesTracker;
  
  constructor() {
    // Initialize without arguments to fix build error
    this.contentProcessor = new ProcessedMessagesTracker();
  }
  
  /**
   * Save a message using this strategy
   */
  async saveMessage(
    role: 'user' | 'assistant', 
    content: string, 
    options?: any
  ): Promise<Message | null> {
    throw new Error('Method not implemented in base strategy');
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedTracking(): void {
    this.contentProcessor.reset();
  }
  
  /**
   * Get the number of pending messages
   */
  getPendingCount(): number {
    return 0;
  }
  
  /**
   * Get the number of active saves
   */
  getActiveSavesCount(): number {
    return 0;
  }
}
