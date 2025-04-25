
import { QueueState } from '../state/QueueState';
import { QueueProcessor } from '../QueueProcessor';

export class QueueInitializer {
  constructor(
    private queueState: QueueState,
    private queueProcessor: QueueProcessor
  ) {}
  
  async saveFirstMessageAndInitialize(role: 'user', content: string, priority: boolean): Promise<void> {
    try {
      console.log(`[QueueInitializer] Saving first message directly to initialize conversation`);
      
      const savedMessage = await this.queueProcessor.saveMessageDirectly({
        role,
        content,
        priority
      });
      
      if (savedMessage && 'conversation_id' in savedMessage) {
        const conversationId = savedMessage.conversation_id;
        console.log(`[QueueInitializer] First message saved successfully with conversation ID:`, conversationId);
        
        if (typeof window !== 'undefined') {
          window.conversationContext = {
            conversationId: conversationId,
            userId: 'user_id' in savedMessage ? (savedMessage as any).user_id : null,
            isInitialized: true,
            messageCount: 1
          };
        }
        
        this.queueState.setInitialized(true);
        
        if (this.queueState.hasPendingMessages()) {
          console.log(`[QueueInitializer] Processing ${this.queueState.getPendingMessageCount()} pending messages after conversation initialization`);
          this.processPendingMessages();
        }
      } else {
        console.error(`[QueueInitializer] Failed to initialize conversation - no conversation_id returned`);
        this.queueState.addPendingMessage(role, content, priority);
      }
    } catch (error) {
      console.error(`[QueueInitializer] Error saving first message:`, error);
      this.queueState.addPendingMessage(role, content, priority);
    }
  }
  
  initializeConversation(): void {
    console.log("[QueueInitializer] Setting conversation as initialized", {
      wasInitialized: this.queueState.isInitialized(),
      pendingMessageCount: this.queueState.getPendingMessageCount(),
      timestamp: new Date().toISOString()
    });
    
    if (this.queueState.isInitialized()) return;
    
    this.queueState.setInitialized(true);
    this.processPendingMessages();
  }
  
  processPendingMessages(): void {
    if (!this.queueState.hasPendingMessages()) return;
    
    console.log(`[QueueInitializer] Processing ${this.queueState.getPendingMessageCount()} pending messages:`, {
      messageTypes: this.queueState.getPendingMessages().map(m => m.role).join(', '),
      priorities: this.queueState.getPendingMessages().map(m => m.priority).join(', ')
    });
    
    const messagesToProcess = this.queueState.getPendingMessages();
    this.queueState.clearPendingMessages();
    
    messagesToProcess.forEach((msg, index) => {
      setTimeout(() => {
        console.log(`[QueueInitializer] Processing pre-init message ${index + 1}/${messagesToProcess.length}:`, {
          role: msg.role,
          priority: msg.priority,
          contentPreview: msg.content.substring(0, 30) + '...'
        });
        this.queueProcessor.queueMessage(msg.role, msg.content, msg.priority);
      }, index * 200);
    });
  }
}
