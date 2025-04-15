
import { Message, SaveMessageCallback } from '../../types';
import { QueueProcessor } from './QueueProcessor';
import { QueueStatus } from './types';

export class MessageQueue {
  private queueProcessor: QueueProcessor;
  private pendingPreInitMessages: Array<{role: 'user' | 'assistant', content: string, priority: boolean}> = [];
  private isConversationInitialized: boolean = false;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
  }
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }

    if (!this.isConversationInitialized) {
      console.log(`Pre-initialization message received, queueing until conversation is ready`);
      this.pendingPreInitMessages.push({ role, content, priority });
      return;
    }
    
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  setConversationInitialized(): void {
    if (this.isConversationInitialized) return;
    
    this.isConversationInitialized = true;
    
    if (this.pendingPreInitMessages.length > 0) {
      console.log(`Processing ${this.pendingPreInitMessages.length} pending messages`);
      
      this.pendingPreInitMessages.forEach((msg, index) => {
        setTimeout(() => {
          console.log(`Processing pre-init message ${index + 1}/${this.pendingPreInitMessages.length}`);
          this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority);
        }, index * 200);
      });
      
      this.pendingPreInitMessages = [];
    }
  }
  
  // Add public getter method to check initialization status
  isInitialized(): boolean {
    return this.isConversationInitialized;
  }
  
  async flushQueue(): Promise<void> {
    if (!this.isConversationInitialized && this.pendingPreInitMessages.length > 0) {
      console.log(`Forcing processing of pending pre-init messages during flush`);
      this.setConversationInitialized();
    }
    
    return this.queueProcessor.flushQueue();
  }
  
  getQueueStatus(): QueueStatus & { pendingPreInitMessages: number } {
    const status = {
      ...this.queueProcessor.getQueueStatus(),
      pendingPreInitMessages: this.pendingPreInitMessages.length
    };

    const { pendingUserMessages } = status;
    console.log(`Queue status: ${this.pendingPreInitMessages.length} pre-init, ${pendingUserMessages} regular`);
    
    return status;
  }
}

export * from './types';
export * from './QueueTypes';
