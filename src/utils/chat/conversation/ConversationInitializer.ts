
import { MessageQueue } from '../messageQueue';
import { StatusCallback } from '../../types';

export class ConversationInitializer {
  private retryInitTimerId: number | null = null;
  
  constructor(
    private statusCallback: StatusCallback,
    private messageQueue: MessageQueue | null
  ) {}

  scheduleConversationInitializationCheck(): void {
    if (this.retryInitTimerId !== null) {
      clearTimeout(this.retryInitTimerId);
    }
    
    const checkAndProcess = () => {
      console.log("Checking conversation initialization status");
      
      if (typeof window !== 'undefined' && window.attuneMessageQueue) {
        if (window.attuneMessageQueue.isInitialized()) {
          console.log("Message queue already initialized, no action needed");
          return;
        }
        
        if (typeof window !== 'undefined' && window.conversationContext && window.conversationContext.conversationId) {
          console.log("Found conversation ID in global context, marking queue as initialized");
          window.attuneMessageQueue.setConversationInitialized();
          return;
        }
        
        console.log("Conversation not yet initialized, scheduling retry");
        this.retryInitTimerId = window.setTimeout(checkAndProcess, 1000);
      } else {
        console.log("Message queue not available, waiting for initialization");
        this.retryInitTimerId = window.setTimeout(checkAndProcess, 1000);
      }
    };
    
    checkAndProcess();
  }

  cleanup(): void {
    if (this.retryInitTimerId !== null) {
      clearTimeout(this.retryInitTimerId);
      this.retryInitTimerId = null;
    }
  }
}
