
import { Message, SaveMessageCallback } from '../types';
import { MessageSaver } from './messageQueue/MessageSaver';
import { messageSaveService } from './messaging/MessageSaveService';

export class MessageQueue {
  private queue: Array<{ role: 'user' | 'assistant', content: string, priority: boolean, time: number }> = [];
  private processingQueue = false;
  private messageSaver: MessageSaver;
  private initialized = false;
  private instanceId = Date.now().toString(36);
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    console.log(`[MessageQueue ${this.instanceId}] Initialized`);
    this.messageSaver = new MessageSaver(saveMessageCallback);
    
    // Monitor queue periodically
    setInterval(() => {
      if (this.queue.length > 0 && !this.processingQueue) {
        console.log(`[MessageQueue ${this.instanceId}] Found ${this.queue.length} pending messages but not processing. Forcing process.`);
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Queue a message with strict role validation
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    // CRITICAL FIX: Validate role is one of the two allowed values - throw error instead of defaulting
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageQueue ${this.instanceId}] CRITICAL ERROR: Invalid role: ${role}. Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // Skip empty content
    if (!content || content.trim() === '') {
      console.log(`[MessageQueue ${this.instanceId}] Skipping empty ${role} message`);
      return;
    }
    
    console.log(`[MessageQueue ${this.instanceId}] Queueing ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`, {
      priority,
      queueLength: this.queue.length,
      timestamp: new Date().toISOString(),
      role: role // Log role for debugging
    });
    
    // Add message to queue with validated role
    this.queue.push({
      role, // Use validated role
      content,
      priority,
      time: Date.now()
    });
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process the queue with priority messages first
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    console.log(`[MessageQueue ${this.instanceId}] Starting queue processing, ${this.queue.length} items in queue`);
    
    try {
      // Sort: priority first, then by time added
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority ? -1 : 1;
        }
        return a.time - b.time;
      });
      
      // Process all messages in queue
      while (this.queue.length > 0) {
        if (!this.initialized) {
          const anyPriorityMessages = this.queue.some(item => item.priority);
          if (!anyPriorityMessages) {
            console.log(`[MessageQueue ${this.instanceId}] Queue not initialized and no priority messages. Waiting.`);
            break;
          }
        }
        
        const item = this.queue.shift();
        if (!item) continue;
        
        // Double-check that role is still valid
        if (item.role !== 'user' && item.role !== 'assistant') {
          console.error(`[MessageQueue ${this.instanceId}] CRITICAL ERROR: Invalid role in queue: ${item.role}. Skipping message.`);
          continue;
        }
        
        console.log(`[MessageQueue ${this.instanceId}] Processing ${item.role} message: "${item.content.substring(0, 30)}${item.content.length > 30 ? '...' : ''}"`, {
          priority: item.priority,
          queueLength: this.queue.length,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Use the central message save service
          await messageSaveService.saveMessageToDatabase({
            role: item.role,
            content: item.content
          });
        } catch (error) {
          console.error(`[MessageQueue ${this.instanceId}] Error saving message:`, error);
        }
      }
    } catch (error) {
      console.error(`[MessageQueue ${this.instanceId}] Error processing queue:`, error);
    } finally {
      this.processingQueue = false;
      console.log(`[MessageQueue ${this.instanceId}] Queue processing complete, ${this.queue.length} items remaining`);
    }
  }

  /**
   * Force the queue to process all pending messages
   */
  async forceFlushQueue(): Promise<void> {
    console.log(`[MessageQueue ${this.instanceId}] Force flushing queue, ${this.queue.length} items`);
    await this.processQueue();
  }
  
  /**
   * Force the queue to process all pending messages - alias for forceFlushQueue
   * to maintain compatibility with existing code
   */
  async flushQueue(): Promise<void> {
    console.log(`[MessageQueue ${this.instanceId}] Flushing queue (alias method), ${this.queue.length} items`);
    return this.forceFlushQueue();
  }
  
  /**
   * Set the conversation initialized state
   */
  setConversationInitialized(): void {
    console.log(`[MessageQueue ${this.instanceId}] Conversation initialized, enabling queue processing`);
    this.initialized = true;
    this.processQueue();
  }
  
  /**
   * Check if the queue is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export any necessary types
export * from './messageQueue/types';
