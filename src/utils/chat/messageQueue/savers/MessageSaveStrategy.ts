
import { Message, SaveMessageCallback } from '../../../types';
import { ProcessedMessagesTracker } from './utils/ProcessedMessagesTracker';
import { DirectSaveStrategy } from './strategies/DirectSaveStrategy';
import { RetrySaveStrategy } from './strategies/RetrySaveStrategy';

/**
 * Coordinates different strategies for saving messages
 */
export class MessageSaveStrategy {
  private processedMessagesTracker: ProcessedMessagesTracker;
  private directSaveStrategy: DirectSaveStrategy;
  private retrySaveStrategy: RetrySaveStrategy;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    // Fix: ProcessedMessagesTracker now takes no arguments
    this.processedMessagesTracker = new ProcessedMessagesTracker();
    this.directSaveStrategy = new DirectSaveStrategy(saveMessageCallback);
    this.retrySaveStrategy = new RetrySaveStrategy(saveMessageCallback);
  }
  
  /**
   * Save with direct strategy (for high priority messages)
   */
  async saveWithDirectStrategy(
    role: 'user' | 'assistant', 
    content: string,
    messageId?: string,
    maxRetries: number = 3
  ): Promise<Message | null> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Skip if already processed
    if (this.processedMessagesTracker.hasProcessed(role, content)) {
      console.log(`Skipping duplicate ${role} message:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed
    this.processedMessagesTracker.markAsProcessed(role, content);
    
    // Use direct save strategy
    return this.directSaveStrategy.saveMessage(role, content, messageId, maxRetries);
  }
  
  /**
   * Save with retry strategy (for lower priority messages)
   */
  async saveWithRetryStrategy(
    role: 'user' | 'assistant', 
    content: string
  ): Promise<Message | null> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return null;
    }
    
    // Skip if already processed
    if (this.processedMessagesTracker.hasProcessed(role, content)) {
      console.log(`Skipping duplicate ${role} message in retry:`, content.substring(0, 50));
      return null;
    }
    
    // Mark as processed
    this.processedMessagesTracker.markAsProcessed(role, content);
    
    // Use retry save strategy
    return this.retrySaveStrategy.saveMessage(role, content);
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedMessages(): void {
    this.processedMessagesTracker.reset();
  }
}
