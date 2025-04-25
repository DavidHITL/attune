
import { QueuedMessage } from '../types';
import { MessageSaveHandler } from '../savers/MessageSaveHandler';
import { ProcessingResult } from '../QueueTypes';

export class QueueProcessingStrategy {
  constructor(
    private messageSaver: MessageSaveHandler,
    private messageQueue: QueuedMessage[]
  ) {}

  async processMessageDirectly(role: 'user' | 'assistant', content: string, messageId?: string): Promise<ProcessingResult> {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return { success: false };
    }

    try {
      console.log(`Processing ${role} message directly:`, content.substring(0, 30));
      const savedMessage = await this.messageSaver.saveMessageDirectly(role, content);
      this.messageSaver.showSaveNotification(role, content);
      
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
    this.messageQueue.push(message);
  }
}
