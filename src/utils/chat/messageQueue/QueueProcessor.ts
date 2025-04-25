
import { SaveMessageCallback } from '../../types';
import { QueuedMessage } from './types';
import { QueueMonitor } from './QueueMonitor';
import { QueueProcessingStrategy } from './processors/QueueProcessingStrategy';
import { MessageSaveHandler } from './savers/MessageSaveHandler';
import { QueueFlusher } from './processors/QueueFlusher';
import { MessageValidator } from './processors/MessageValidator';

export class QueueProcessor {
  private messageQueue: QueuedMessage[] = [];
  private messageSaver: MessageSaveHandler;
  private queueMonitor: QueueMonitor;
  private processingStrategy: QueueProcessingStrategy;
  private queueFlusher: QueueFlusher;
  private messageValidator: MessageValidator;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageSaver = new MessageSaveHandler(saveMessageCallback);
    this.processingStrategy = new QueueProcessingStrategy(this.messageSaver, this.messageQueue);
    
    // Fix: Pass required getter functions to QueueMonitor
    this.queueMonitor = new QueueMonitor(
      () => this.messageQueue.length,
      () => this.messageSaver.getPendingUserMessages(),
      () => this.messageSaver.getActiveMessageSaves()
    );
    
    // Fix: Pass required arguments to QueueFlusher
    this.queueFlusher = new QueueFlusher(
      this.messageQueue, 
      this.saveMessageCallback, 
      this.messageSaver
    );
    
    // Fix: Pass required validator function to MessageValidator
    this.messageValidator = new MessageValidator(
      (role, content) => this.messageSaver.isValidContent(content)
    );
  }
  
  async saveMessageDirectly(message: QueuedMessage): Promise<any> {
    return this.processingStrategy.processMessageDirectly(
      message.role,
      message.content
    );
  }
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!this.messageValidator.isValidMessage(role, content)) {
      return;
    }
    
    console.log(`Queued ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}", priority: ${priority}`);
    
    if (priority) {
      console.log(`Processing ${role} message with HIGH PRIORITY`);
      const messageId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.saveMessageDirectly({ role, content, priority });
    } else {
      this.processingStrategy.queueMessage({ role, content, priority });
      console.log(`Queue length: ${this.messageQueue.length}`);
    }
  }

  async flushQueue(): Promise<void> {
    await this.queueFlusher.flushQueue();
  }
  
  getQueueStatus(): { queueLength: number, pendingUserMessages: number, activeSaves: number } {
    return {
      queueLength: this.messageQueue.length,
      pendingUserMessages: this.messageSaver.getPendingUserMessages(),
      activeSaves: this.messageSaver.getActiveMessageSaves()
    };
  }
}
