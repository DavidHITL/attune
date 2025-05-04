
import { Message, SaveMessageCallback } from '../../types';
import { MessageQueueCore } from './MessageQueueCore';
import { MessageProcessor } from './processors/MessageProcessor';
import { QueueInitializer } from './initialization/QueueInitializer';
import { getOrCreateConversationId } from '@/hooks/useConversationId';
import { supabase } from '@/integrations/supabase/client';
import { MessageDeduplicator } from './processors/MessageDeduplicator';

export class MessageQueue {
  private queueCore: MessageQueueCore;
  private processor: MessageProcessor;
  private initializer: QueueInitializer;
  private deduplicator: MessageDeduplicator;
  private instanceId = Date.now().toString(36);
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueCore = new MessageQueueCore();
    this.processor = new MessageProcessor(saveMessageCallback);
    this.deduplicator = new MessageDeduplicator();
    this.initializer = new QueueInitializer(getOrCreateConversationId, supabase);
    
    // Monitor queue periodically
    setInterval(() => {
      if (this.queueCore.size() > 0 && !this.queueCore.isProcessing()) {
        this.processQueue();
      }
    }, 5000);

    // Clean recently processed messages every minute
    setInterval(() => {
      this.deduplicator.clear();
    }, 60000);

    // Check if conversation ID is already available
    this.initializer.checkConversationId();
  }

  /**
   * Queue a message with strict role validation and deduplication
   */
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    // Create conversation ID if needed
    if (typeof window !== 'undefined' && !window.__attuneConversationId && !this.initializer.isInitialized()) {
      // IMPORTANT: Always queue message even without conversation ID
      // It will be buffered until conversation is initialized
      console.log(`[MessageQueue] Queueing ${role} message without conversation ID: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      this.queueMessageInternal(role, content, priority);
      return;
    }
    
    this.queueMessageInternal(role, content, priority);
  }

  /**
   * Internal method to queue a message after validation
   */
  private queueMessageInternal(role: 'user' | 'assistant', content: string, priority: boolean): void {
    // Validate role is one of the two allowed values
    if (role !== 'user' && role !== 'assistant') {
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // Skip empty content
    if (!content || content.trim() === '') {
      return;
    }

    // Check for duplicate messages
    if (this.deduplicator.isDuplicate(role, content)) {
      return;
    }
    
    // Track this message to prevent duplicates
    this.deduplicator.markAsProcessed(role, content);
    
    // Add message to queue with validated role
    this.queueCore.enqueue({
      role,
      content,
      priority,
      time: Date.now()
    });
    
    // Enhanced logging for debugging buffering behavior
    if (!this.initializer.isInitialized()) {
      console.log(`[MessageQueue] Message from ${role} buffered (waiting for conversation ID): "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
    }
    
    // Process queue if not already processing
    if (!this.queueCore.isProcessing()) {
      this.processQueue();
    }
  }

  /**
   * Process the queue with priority messages first
   */
  private async processQueue(): Promise<void> {
    if (this.queueCore.isProcessing() || this.queueCore.isEmpty()) {
      return;
    }
    
    this.queueCore.setProcessing(true);
    
    try {
      // Enhanced logging for debugging when initialized
      if (this.initializer.isInitialized() && this.queueCore.size() > 0) {
        console.log(`[MessageQueue] Flushing ${this.queueCore.size()} messages from queue`);
      }
      
      // Process all messages in queue
      await this.processor.processQueue(
        this.queueCore, 
        this.initializer.isInitialized()
      );
    } catch (error) {
      throw new Error(`Error processing queue: ${error}`);
    } finally {
      this.queueCore.setProcessing(false);
    }
  }

  /**
   * Force the queue to process all pending messages
   */
  async forceFlushQueue(): Promise<void> {
    await this.processQueue();
  }
  
  /**
   * Force the queue to process all pending messages - alias for forceFlushQueue
   * to maintain compatibility with existing code
   */
  async flushQueue(): Promise<void> {
    return this.forceFlushQueue();
  }
  
  /**
   * Set the conversation initialized state
   * This will trigger processing any pending messages
   */
  setConversationInitialized(): void {
    // Log the state change
    console.log(`[MessageQueue] Setting conversation initialized with ${this.queueCore.size()} messages in buffer`);
    
    // Set initialized state in initializer
    this.initializer.setInitialized(true);
    
    // Process any pending messages now that we're initialized
    this.processQueue();
  }
  
  /**
   * Check if the queue is initialized
   */
  isInitialized(): boolean {
    return this.initializer.isInitialized();
  }
}
