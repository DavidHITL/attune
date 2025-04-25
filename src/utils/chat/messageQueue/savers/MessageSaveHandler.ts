
import { SaveMessageCallback } from '../../../types';
import { Message } from '../../../types';
import { toast } from 'sonner';

export class MessageSaveHandler {
  private processedMessages = new Set<string>();
  private activeSaves = 0;
  private pendingUserMessages = new Set<string>();
  
  constructor(private saveMessageCallback: SaveMessageCallback) {}
  
  async saveMessageDirectly(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    try {
      return await this.saveMessageCallback({
        role,
        content
      });
    } catch (error) {
      console.error(`Direct save failed for ${role} message:`, error);
      throw error;
    }
  }

  showSaveNotification(role: 'user' | 'assistant', content: string) {
    if (role === 'user') {
      toast.success("Message saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
  
  // Add required methods to satisfy MessageSaver interface
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Implementation of retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        return await this.saveMessageCallback({
          role,
          content
        });
      } catch (error) {
        console.error(`Retry save failed for ${role} message (attempt ${attempts}):`, error);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
      }
    }
    
    return null;
  }
  
  // Message tracking functionality
  trackMessageSaveStart(): void {
    this.activeSaves++;
  }
  
  trackMessageSaveComplete(): void {
    this.activeSaves = Math.max(0, this.activeSaves - 1);
  }
  
  trackPendingUserMessage(messageId: string): void {
    this.pendingUserMessages.add(messageId);
  }
  
  removePendingUserMessage(messageId: string): void {
    this.pendingUserMessages.delete(messageId);
  }
  
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    const key = `${role}-${content.substring(0, 20)}`;
    this.processedMessages.add(key);
  }
  
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    const key = `${role}-${content.substring(0, 20)}`;
    return this.processedMessages.has(key);
  }
  
  resetProcessedMessages(): void {
    this.processedMessages.clear();
  }
  
  getActiveMessageSaves(): number {
    return this.activeSaves;
  }
  
  getPendingUserMessages(): number {
    return this.pendingUserMessages.size;
  }
  
  reportPendingMessages(): void {
    if (this.pendingUserMessages.size > 0) {
      console.warn(`There are ${this.pendingUserMessages.size} pending user messages that were never completed`);
    }
  }
  
  // Content validation
  isValidContent(content: string): boolean {
    return !!content && content.trim() !== '';
  }
}
