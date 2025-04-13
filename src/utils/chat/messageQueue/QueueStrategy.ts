
import { QueuedMessage } from './types';
import { ProcessingResult } from './QueueTypes';
import { MessageSaver } from './MessageSaver';

/**
 * Handles different message processing strategies
 */
export class QueueStrategy {
  constructor(
    private messageSaver: MessageSaver
  ) {}
  
  /**
   * Process a message directly with higher reliability
   */
  async processMessageDirectly(message: QueuedMessage, messageId?: string): Promise<ProcessingResult> {
    try {
      const savedMessage = await this.messageSaver.saveMessageDirectly(
        message.role, 
        message.content, 
        messageId
      );
      
      return {
        success: true,
        messageId: savedMessage?.id
      };
    } catch (error) {
      console.error(`Direct processing failed for ${message.role} message:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error")
      };
    }
  }
  
  /**
   * Process a message with retry capability
   */
  async processMessageWithRetry(message: QueuedMessage): Promise<ProcessingResult> {
    try {
      const savedMessage = await this.messageSaver.saveMessageWithRetry(
        message.role,
        message.content
      );
      
      return {
        success: !!savedMessage,
        messageId: savedMessage?.id
      };
    } catch (error) {
      console.error(`Failed to process ${message.role} message with retry:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Message saving failed")
      };
    }
  }
  
  /**
   * Determine processing strategy based on message attributes
   */
  selectStrategy(message: QueuedMessage): 'direct' | 'retry' {
    // User messages or priority messages use direct strategy
    if (message.role === 'user' || message.priority) {
      return 'direct';
    }
    // Assistant messages use retry strategy
    return 'retry';
  }
}
