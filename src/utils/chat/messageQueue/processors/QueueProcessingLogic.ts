
import { QueuedMessage } from '../types';
import { MessageSaver } from '../MessageSaver';
import { toast } from 'sonner';
import { ProcessingResult } from '../QueueTypes';

/**
 * Handles the core logic of processing messages in the queue
 */
export class QueueProcessingLogic {
  constructor(
    private messageSaver: MessageSaver,
    private messageQueue: QueuedMessage[]
  ) {}
  
  /**
   * Process a message directly with error handling
   */
  async processMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<ProcessingResult> {
    // Skip empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return { success: false };
    }
    
    try {
      console.log(`Processing ${role} message directly: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      
      // For user messages, show toast
      if (role === 'user') {
        toast.info("Processing user message", {
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          id: `queue-${messageId || Date.now()}`,
          duration: 1500,
        });
      }
      
      const savedMessage = await this.messageSaver.saveMessageDirectly(
        role, 
        content, 
        messageId
      );
      
      return {
        success: true,
        messageId: savedMessage?.id
      };
    } catch (error) {
      console.error(`Direct processing failed for ${role} message:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error")
      };
    }
  }
  
  /**
   * Add a message to the queue
   */
  addToQueue(message: QueuedMessage): void {
    this.messageQueue.push(message);
  }
  
  /**
   * Prioritize a message by adding it to the front of the queue
   */
  prioritizeMessage(message: QueuedMessage): void {
    this.messageQueue.unshift(message);
  }
}
