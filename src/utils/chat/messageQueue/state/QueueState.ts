
import { QueuedMessage } from '../types';

export class QueueState {
  private pendingPreInitMessages: Array<QueuedMessage> = [];
  private isConversationInitialized: boolean = false;
  
  addPendingMessage(role: 'user' | 'assistant', content: string, priority: boolean): void {
    this.pendingPreInitMessages.push({ role, content, priority });
  }
  
  getPendingMessages(): Array<QueuedMessage> {
    return [...this.pendingPreInitMessages];
  }
  
  clearPendingMessages(): void {
    this.pendingPreInitMessages = [];
  }
  
  getPendingMessageCount(): number {
    return this.pendingPreInitMessages.length;
  }
  
  hasPendingMessages(): boolean {
    return this.pendingPreInitMessages.length > 0;
  }
  
  setInitialized(value: boolean = true): void {
    this.isConversationInitialized = value;
  }
  
  isInitialized(): boolean {
    return this.isConversationInitialized;
  }
}
