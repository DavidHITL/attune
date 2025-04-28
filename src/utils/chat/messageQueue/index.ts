import { Message, SaveMessageCallback } from '../../types';
import { QueueProcessor } from './QueueProcessor';
import { QueueStatus } from './types';

export class MessageQueue {
  private queueProcessor: QueueProcessor;
  private pendingPreInitMessages: Array<{role: 'user' | 'assistant', content: string, priority: boolean}> = [];
  private isConversationInitialized: boolean = false;
  private processingTimeoutId: number | null = null;
  private conversationId: string | null = null;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.queueProcessor = new QueueProcessor(saveMessageCallback);
    
    // Check if there's already a conversation ID in the global context
    // This helps with race conditions during initialization
    if (typeof window !== 'undefined' && window.conversationContext?.conversationId) {
      console.log("[MessageQueue] Found existing conversation ID during construction:", window.conversationContext.conversationId);
      this.isConversationInitialized = true;
    }
  }
  
  queueMessage(role: 'user' | 'assistant', content: string, priority: boolean = false): void {
    if (!content || content.trim() === '') {
      console.log(`Skipping empty ${role} message`);
      return;
    }

    // Check if the conversation is initialized or if we have a conversation ID in global context
    const isInitialized = this.checkInitialized();
    
    // CRITICAL FIX: For the first user message, initialize conversation immediately
    // instead of queuing it in pendingPreInitMessages
    if (!isInitialized && role === 'user') {
      console.log(`[MessageQueue] First user message received. Initializing conversation immediately...`);
      
      // For the first message, we'll save directly and get a conversation ID
      this.saveFirstMessageAndInitialize(role, content, priority);
      return;
    }
    
    // For non-first messages or assistant messages before initialization
    if (!isInitialized) {
      console.log(`[MessageQueue] Pre-initialization ${role} message received, queueing until conversation is ready`);
      this.pendingPreInitMessages.push({ role, content, priority });
      return;
    }
    
    this.queueProcessor.queueMessage(role, content, priority);
  }
  
  // CRITICAL FIX: New method to handle the first message specially
  private async saveFirstMessageAndInitialize(role: 'user', content: string, priority: boolean): Promise<void> {
    try {
      console.log(`[MessageQueue] Saving first message directly to initialize conversation`);
      
      // Save the message directly to get a conversation ID
      const savedMessage = await this.saveMessageCallback({
        role: role,
        content: content
      });
      
      // Check if savedMessage exists and has a conversation_id property
      // The type doesn't guarantee this, so we need to check at runtime
      if (savedMessage && 'conversation_id' in savedMessage) {
        const conversationId = (savedMessage as Message & { conversation_id: string }).conversation_id;
        console.log(`[MessageQueue] First message saved successfully with conversation ID:`, conversationId);
        
        // Update global context with the new conversation ID
        if (typeof window !== 'undefined') {
          window.conversationContext = {
            conversationId: conversationId,
            userId: 'user_id' in savedMessage ? (savedMessage as any).user_id : null,
            isInitialized: true,
            messageCount: 1
          };
        }
        
        // Mark conversation as initialized
        this.isConversationInitialized = true;
        
        // Process any pending messages (likely assistant responses)
        if (this.pendingPreInitMessages.length > 0) {
          console.log(`[MessageQueue] Processing ${this.pendingPreInitMessages.length} pending messages after conversation initialization`);
          this.processPendingMessages();
        }
      } else {
        console.error(`[MessageQueue] Failed to initialize conversation - no conversation_id returned`);
        // Fall back to queueing if direct save failed
        this.pendingPreInitMessages.push({ role, content, priority });
      }
    } catch (error) {
      console.error(`[MessageQueue] Error saving first message:`, error);
      // Fall back to queueing if direct save failed
      this.pendingPreInitMessages.push({ role, content, priority });
    }
  }
  
  private checkInitialized(): boolean {
    // Check if already marked as initialized
    if (this.isConversationInitialized) {
      return true;
    }
    
    // Check if there's a conversation ID in window context
    if (typeof window !== 'undefined' && window.conversationContext?.conversationId) {
      console.log("[MessageQueue] Found conversation ID in global context:", window.conversationContext.conversationId);
      this.isConversationInitialized = true;
      return true;
    }
    
    return false;
  }
  
  setConversationInitialized(): void {
    console.log("[MessageQueue] Setting conversation as initialized", {
      wasInitialized: this.isConversationInitialized,
      pendingMessageCount: this.pendingPreInitMessages.length,
      timestamp: new Date().toISOString()
    });
    
    if (this.isConversationInitialized) return;
    
    this.isConversationInitialized = true;
    
    // Process any pending messages
    this.processPendingMessages();
  }
  
  // Extracted method to process pending messages
  private processPendingMessages(): void {
    // Ensure we clear any existing processing timeout
    if (this.processingTimeoutId !== null) {
      clearTimeout(this.processingTimeoutId);
    }
    
    if (this.pendingPreInitMessages.length > 0) {
      console.log(`[MessageQueue] Processing ${this.pendingPreInitMessages.length} pending messages:`, {
        messageTypes: this.pendingPreInitMessages.map(m => m.role).join(', '),
        priorities: this.pendingPreInitMessages.map(m => m.priority).join(', ')
      });
      
      // Process messages with progressive delays to ensure proper order
      // Create a copy of the messages to process
      const messagesToProcess = [...this.pendingPreInitMessages];
      this.pendingPreInitMessages = [];
      
      // Process messages with slight delays to maintain order
      messagesToProcess.forEach((msg, index) => {
        setTimeout(() => {
          console.log(`[MessageQueue] Processing pre-init message ${index + 1}/${messagesToProcess.length}:`, {
            role: msg.role,
            priority: msg.priority,
            contentPreview: msg.content.substring(0, 30) + '...'
          });
          this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority);
        }, index * 200);
      });
    }
  }
  
  // Add public getter method to check initialization status
  isInitialized(): boolean {
    return this.checkInitialized();
  }
  
  async flushQueue(): Promise<void> {
    if (!this.conversationId && window.conversationContext?.conversationId) {
      this.conversationId = window.conversationContext.conversationId;
    }

    if (!this.isConversationInitialized && this.pendingPreInitMessages.length > 0) {
      console.log(`Forcing processing of pending pre-init messages during flush`);
      this.setConversationInitialized();
    }
    
    // Process messages with progressive delays to maintain order
    const messagesToProcess = [...this.pendingPreInitMessages];
    this.pendingPreInitMessages = [];
    
    messagesToProcess.forEach((msg, index) => {
      setTimeout(() => {
        console.log(`Processing pre-init message ${index + 1}/${messagesToProcess.length}:`, {
          role: msg.role,
          priority: msg.priority,
          contentPreview: msg.content.substring(0, 30) + '...'
        });
        this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority);
      }, index * 200);
    });

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
  
  // Force flush all messages in queue
  async forceFlushQueue(): Promise<void> {
    // Process any pending pre-init messages first
    if (this.pendingPreInitMessages.length > 0) {
      console.log(`Force-processing ${this.pendingPreInitMessages.length} pending pre-init messages`);
      this.processPendingMessages();
    }
    
    // Then flush the main queue
    return this.queueProcessor.flushQueue();
  }
}

export * from './types';
export * from './QueueTypes';
