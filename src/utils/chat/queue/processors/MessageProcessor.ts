
import { SaveMessageCallback } from '../../../types';
import { MessageQueueCore } from '../MessageQueueCore';
import { messageSaveService } from '../../messaging/MessageSaveService';

/**
 * Handles message processing and saving
 */
export class MessageProcessor {
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  /**
   * Process all messages in the queue
   */
  async processQueue(queueCore: MessageQueueCore, initialized: boolean): Promise<void> {
    // Sort: priority first, then by time added
    queueCore.sortByPriority();
    
    // Process all messages in queue
    while (!queueCore.isEmpty()) {
      if (!initialized) {
        const messages = queueCore.getAll();
        const anyPriorityMessages = messages.some(item => item.priority);
        if (!anyPriorityMessages) {
          break;
        }
      }
      
      const item = queueCore.dequeue();
      if (!item) continue;
      
      // Critical validation: Ensure role is strictly 'user' or 'assistant'
      if (item.role !== 'user' && item.role !== 'assistant') {
        throw new Error(`Invalid role encountered: ${item.role}. Must be 'user' or 'assistant'.`);
      }
      
      try {
        // Use the central message save service for unified processing path
        // This ensures all messages (user and assistant) go through the same code path
        await messageSaveService.saveMessageToDatabase({
          role: item.role,
          content: item.content,
          conversation_id: typeof window !== 'undefined' ? window.__attuneConversationId : undefined
        });
      } catch (error) {
        throw new Error(`Error saving ${item.role} message: ${error}`);
      }
    }
  }
}
