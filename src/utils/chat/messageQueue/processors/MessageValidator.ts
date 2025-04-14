
import { QueuedMessage } from '../types';
import { MessageSaver } from '../MessageSaver';

/**
 * Handles validation and filtering of messages
 */
export class MessageValidator {
  constructor(
    private messageSaver: MessageSaver
  ) {}
  
  /**
   * Check if a message is valid and should be processed
   */
  isValidMessage(role: 'user' | 'assistant', content: string): boolean {
    // Don't save empty messages
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if message is a duplicate
   */
  isDuplicate(role: 'user' | 'assistant', content: string, queue: QueuedMessage[]): boolean {
    // Check for duplicate content in storage
    if (this.messageSaver.isDuplicateContent(role, content)) {
      // Check for duplicate content in queue
      if (queue.some(msg => 
        msg.role === role && 
        msg.content.trim() === content.trim()
      )) {
        console.log(`Duplicate ${role} message detected, skipping`);
        return true;
      }
    }
    
    return false;
  }
}
