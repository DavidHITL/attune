
import { SaveMessageCallback } from '../../types';
import { QueueState } from './state/QueueState';
import { QueueProcessor } from './QueueProcessor';
import { QueueInitializer } from './initialization/QueueInitializer';
import { QueueStatus } from './types';
import { toast } from 'sonner';

export class MessageQueue {
  private queueState: QueueState;
  private queueProcessor: QueueProcessor;
  private queueInitializer: QueueInitializer;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueState = new QueueState();
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
    this.queueInitializer = new QueueInitializer(this.queueState, this.queueProcessor);
  }
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }

    const isInitialized = this.checkInitialized();
    
    if (!isInitialized && role === 'user') {
      console.log(`[MessageQueue] First user message received. Initializing conversation immediately...`);
      this.queueInitializer.saveFirstMessageAndInitialize(role, content, priority);
      return;
    }
    
    if (!isInitialized) {
      console.log(`[MessageQueue] Pre-initialization ${role} message received, queueing until conversation is ready`);
      this.queueState.addPendingMessage(role, content, priority);
      return;
    }
    
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  private checkInitialized(): boolean {
    return this.queueState.isInitialized() || 
           (typeof window !== 'undefined' && window.conversationContext?.conversationId);
  }
  
  setConversationInitialized(): void {
    this.queueInitializer.initializeConversation();
  }
  
  isInitialized(): boolean {
    return this.checkInitialized();
  }
  
  async flushQueue(): Promise<void> {
    if (!this.queueState.isInitialized() && this.queueState.hasPendingMessages()) {
      console.log(`Forcing processing of pending pre-init messages during flush`);
      this.setConversationInitialized();
    }
    
    return this.queueProcessor.flushQueue();
  }
  
  getQueueStatus(): QueueStatus & { pendingPreInitMessages: number } {
    return {
      ...this.queueProcessor.getQueueStatus(),
      pendingPreInitMessages: this.queueState.getPendingMessageCount()
    };
  }
  
  async forceFlushQueue(): Promise<void> {
    if (this.queueState.hasPendingMessages()) {
      console.log(`Force-processing ${this.queueState.getPendingMessageCount()} pending pre-init messages`);
      this.queueInitializer.processPendingMessages();
    }
    
    return this.queueProcessor.flushQueue();
  }
}

export * from './types';
export * from './QueueTypes';
