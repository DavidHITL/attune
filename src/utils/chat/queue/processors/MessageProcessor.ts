
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
          console.log(`[MessageProcessor] Queue not initialized and no priority messages. Waiting.`);
          break;
        }
      }
      
      const item = queueCore.dequeue();
      if (!item) continue;
      
      // Double-check that role is still valid
      if (item.role !== 'user' && item.role !== 'assistant') {
        console.error(`[MessageProcessor] CRITICAL ERROR: Invalid role in queue: ${item.role}. Skipping message.`);
        continue;
      }
      
      console.log(`[MessageProcessor] Processing ${item.role} message: "${item.content.substring(0, 30)}${item.content.length > 30 ? '...' : ''}"`, {
        priority: item.priority,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Use the central message save service and attach the conversation ID
        await messageSaveService.saveMessageToDatabase({
          role: item.role,
          content: item.content,
          conversation_id: typeof window !== 'undefined' ? window.__attuneConversationId : undefined
        });
      } catch (error) {
        console.error(`[MessageProcessor] Error saving message:`, error);
      }
    }
  }
}
