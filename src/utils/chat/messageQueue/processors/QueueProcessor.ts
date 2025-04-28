
import { SaveMessageCallback } from '../../../types';
import { QueuedMessage } from '../types';
import { QueueMonitor } from '../QueueMonitor';
import { ProcessingResult } from '../QueueTypes';
import { MessageSaveHandler } from '../savers/MessageSaveHandler';
import { QueueFlusher } from './QueueFlusher';
import { MessageValidator } from './MessageValidator';
import { QueueProcessingManager } from './QueueProcessingManager';
import { QueueStatusTracker } from './QueueStatusTracker';

export class QueueProcessor {
  private messageQueue: QueuedMessage[] = [];
  private messageSaver: MessageSaveHandler;
  private queueMonitor: QueueMonitor;
  private processingManager: QueueProcessingManager;
  private queueFlusher: QueueFlusher;
  private messageValidator: MessageValidator;
  private statusTracker: QueueStatusTracker;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.messageSaver = new MessageSaveHandler(saveMessageCallback);
    this.processingManager = new QueueProcessingManager(this.messageSaver, this.messageQueue);
    
    this.queueMonitor = new QueueMonitor(
      () => this.messageQueue.length,
      () => this.messageSaver.getPendingUserMessages(),
      () => this.messageSaver.getActiveMessageSaves()
    );
    
    this.queueFlusher = new QueueFlusher(
      this.messageQueue, 
      this.saveMessageCallback, 
      this.messageSaver
    );
    
    this.messageValidator = new MessageValidator(
      (role, content) => this.messageSaver.isValidContent(content)
    );
    
    this.statusTracker = new QueueStatusTracker(
      () => this.messageQueue.length,
      () => this.messageSaver.getPendingUserMessages(),
      () => this.messageSaver.getActiveMessageSaves()
    );
  }
  
  async saveMessageDirectly(message: QueuedMessage): Promise<any> {
    return this.processingManager.processMessageDirectly(
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
      this.processingManager.queueMessage({ role, content, priority });
      console.log(`Queue length: ${this.messageQueue.length}`);
    }
  }

  async flushQueue(): Promise<void> {
    await this.queueFlusher.flushQueue();
  }
  
  getQueueStatus(): { queueLength: number, pendingUserMessages: number, activeSaves: number } {
    return this.statusTracker.getQueueStatus();
  }
}
