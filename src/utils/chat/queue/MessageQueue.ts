
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
    console.log(`[MessageQueue ${this.instanceId}] Initialized`);
    
    this.queueCore = new MessageQueueCore();
    this.processor = new MessageProcessor(saveMessageCallback);
    this.deduplicator = new MessageDeduplicator();
    this.initializer = new QueueInitializer(getOrCreateConversationId, supabase);
    
    // Monitor queue periodically
    setInterval(() => {
      if (this.queueCore.size() > 0 && !this.queueCore.isProcessing()) {
        console.log(`[MessageQueue ${this.instanceId}] Found ${this.queueCore.size()} pending messages but not processing. Forcing process.`);
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
    // CRITICAL FIX: Hard-stop if no conversationId before queuing
    if (typeof window !== 'undefined' && !window.__attuneConversationId && !this.initializer.isInitialized()) {
      // Instead of aborting, ensure we have a conversation ID
      this.initializer.ensureConversationId().then(conversationId => {
        if (conversationId) {
          console.log(`[MessageQueue ${this.instanceId}] Successfully created conversation ID: ${conversationId}`);
          // Re-queue the message now that we have a conversation ID
          this.queueMessageInternal(role, content, priority);
        } else {
          console.error(`[MessageQueue ${this.instanceId}] Failed to create conversation ID, message will not be saved`);
        }
      });
      return;
    }
    
    this.queueMessageInternal(role, content, priority);
  }

  /**
   * Internal method to queue a message after validation
   */
  private queueMessageInternal(role: 'user' | 'assistant', content: string, priority: boolean): void {
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

    // Check for duplicate messages
    if (this.deduplicator.isDuplicate(role, content)) {
      console.log(`[MessageQueue ${this.instanceId}] Skipping duplicate ${role} message`);
      return;
    }
    
    console.log(`[MessageQueue ${this.instanceId}] Queueing ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`, {
      priority,
      queueLength: this.queueCore.size(),
      timestamp: new Date().toISOString(),
      role: role, // Log role for debugging
      conversationId: window.__attuneConversationId // Log the conversation ID for debugging
    });
    
    // Track this message to prevent duplicates
    this.deduplicator.markAsProcessed(role, content);
    
    // Add message to queue with validated role and conversation_id
    this.queueCore.enqueue({
      role, // Use validated role
      content,
      priority,
      time: Date.now()
    });
    
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
    console.log(`[MessageQueue ${this.instanceId}] Starting queue processing, ${this.queueCore.size()} items in queue`);
    
    try {
      // Process all messages in queue
      await this.processor.processQueue(
        this.queueCore, 
        this.initializer.isInitialized()
      );
    } catch (error) {
      console.error(`[MessageQueue ${this.instanceId}] Error processing queue:`, error);
    } finally {
      this.queueCore.setProcessing(false);
      console.log(`[MessageQueue ${this.instanceId}] Queue processing complete, ${this.queueCore.size()} items remaining`);
    }
  }

  /**
   * Force the queue to process all pending messages
   */
  async forceFlushQueue(): Promise<void> {
    console.log(`[MessageQueue ${this.instanceId}] Force flushing queue, ${this.queueCore.size()} items`);
    await this.processQueue();
  }
  
  /**
   * Force the queue to process all pending messages - alias for forceFlushQueue
   * to maintain compatibility with existing code
   */
  async flushQueue(): Promise<void> {
    console.log(`[MessageQueue ${this.instanceId}] Flushing queue (alias method), ${this.queueCore.size()} items`);
    return this.forceFlushQueue();
  }
  
  /**
   * Set the conversation initialized state
   */
  setConversationInitialized(): void {
    console.log(`[MessageQueue ${this.instanceId}] Conversation initialized, enabling queue processing`);
    this.initializer.setInitialized(true);
    this.processQueue();
  }
  
  /**
   * Check if the queue is initialized
   */
  isInitialized(): boolean {
    return this.initializer.isInitialized();
  }
}
