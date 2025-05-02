
import { MessageSaveHandler } from '../savers/MessageSaveHandler';
import { QueuedMessage } from '../types';
import { ProcessingResult } from '../QueueTypes';
import { toast } from 'sonner';

export class QueueProcessingManager {
  constructor(
    private messageSaver: MessageSaveHandler,
    private messageQueue: QueuedMessage[]
  ) {}

  async processMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<ProcessingResult> {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return { success: false };
    }
    
    // Validate role
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[QueueProcessingManager] Invalid role provided: "${role}". Must be 'user' or 'assistant'`);
      return { 
        success: false, 
        error: new Error(`Invalid role: ${role}`) 
      };
    }

    try {
      console.log(`Processing ${role} message directly:`, content.substring(0, 30));
      const savedMessage = await this.messageSaver.saveMessageDirectly(role, content);
      
      if (role === 'user') {
        toast.info("Processing user message", {
          description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
          duration: 1500
        });
      }
      
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

  queueMessage(message: QueuedMessage): void {
    // Validate role before queueing
    if (message.role !== 'user' && message.role !== 'assistant') {
      console.error(`[QueueProcessingManager] Cannot queue message with invalid role: ${message.role}`);
      return;
    }
    
    this.messageQueue.push(message);
  }
}
