import { SaveMessageCallback } from '../../../types';
import { Message } from '../../../types';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

export class MessageSaveHandler {
  private processedMessages = new Set<string>();
  private activeSaves = 0;
  private pendingUserMessages = new Set<string>();
  private messageCounter: { user: number, assistant: number } = { user: 0, assistant: 0 };
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    console.log('[MessageSaveHandler] Initialized');
  }
  
  async saveMessageDirectly(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // CRITICAL FIX: Throw error for invalid roles instead of silently defaulting
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaveHandler] FATAL ERROR: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // Track message count by role
    this.messageCounter[role]++;
    
    try {
      console.log(`[MessageSaveHandler] Direct save attempt for ${role} message #${this.messageCounter[role]}:`, {
        role: role, // Log role explicitly
        contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
      
      // Create a clean object to avoid reference issues
      const messageObj = {
        role: role,
        content: content
      };
      
      console.log(`[MessageSaveHandler] ⚠️ PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
      
      // Use the central message save service
      const result = await messageSaveService.saveMessageToDatabase(messageObj);
      
      if (result) {
        console.log(`[MessageSaveHandler] ✅ Successfully saved ${role} message #${this.messageCounter[role]} with ID: ${result.id}, FINAL ROLE: ${result.role}`);
        
        if (result.role !== role) {
          console.error(`[MessageSaveHandler] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${result.role}"`);
        }
      } else {
        console.log(`[MessageSaveHandler] ⚠️ No result returned when saving ${role} message #${this.messageCounter[role]}`);
      }
      
      return result || null;
    } catch (error) {
      console.error(`[MessageSaveHandler] ❌ Direct save failed for ${role} message #${this.messageCounter[role]}:`, error);
      throw error;
    }
  }

  showSaveNotification(role: 'user' | 'assistant', content: string) {
    if (role === 'user') {
      toast.success("Message saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    } else if (role === 'assistant') {
      toast.success("Response saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
  
  // Add required methods to satisfy MessageSaver interface
  async saveMessageWithRetry(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // CRITICAL FIX: Validate role
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaveHandler] FATAL ERROR in saveMessageWithRetry: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    // Track message count by role
    this.messageCounter[role]++;
    
    // Implementation of retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    console.log(`[MessageSaveHandler] Starting retry save for ${role} message #${this.messageCounter[role]}`);
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[MessageSaveHandler] Attempt ${attempts}/${maxAttempts} for ${role} message #${this.messageCounter[role]}`);
        
        // CRITICAL FIX: Create a clean object for each retry attempt
        const messageObj = {
          role: role,
          content: content
        };
        
        console.log(`[MessageSaveHandler] ⚠️ RETRY ${attempts} PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
        
        // Use the central message save service
        const result = await messageSaveService.saveMessageToDatabase(messageObj);
        
        if (result) {
          console.log(`[MessageSaveHandler] ✅ Successfully saved ${role} message #${this.messageCounter[role]} with ID: ${result.id} on attempt ${attempts}, FINAL ROLE: ${result.role}`);
          
          if (result.role !== role) {
            console.error(`[MessageSaveHandler] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${result.role}"`);
          }
        }
        
        return result;
      } catch (error) {
        console.error(`[MessageSaveHandler] ❌ Retry save failed for ${role} message #${this.messageCounter[role]} (attempt ${attempts}):`, error);
        
        if (attempts >= maxAttempts) {
          console.error(`[MessageSaveHandler] ❌ All ${maxAttempts} attempts failed for ${role} message #${this.messageCounter[role]}`);
          throw error;
        }
        
        // Wait before retry
        const delay = attempts * 1000;
        console.log(`[MessageSaveHandler] Waiting ${delay}ms before retry attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }
  
  // Message tracking functionality
  trackMessageSaveStart(): void {
    this.activeSaves++;
    console.log(`[MessageSaveHandler] Active saves increased to ${this.activeSaves}`);
  }
  
  trackMessageSaveComplete(): void {
    this.activeSaves = Math.max(0, this.activeSaves - 1);
    console.log(`[MessageSaveHandler] Active saves decreased to ${this.activeSaves}`);
  }
  
  trackPendingUserMessage(messageId: string): void {
    this.pendingUserMessages.add(messageId);
    console.log(`[MessageSaveHandler] Tracking pending user message: ${messageId}, total: ${this.pendingUserMessages.size}`);
  }
  
  removePendingUserMessage(messageId: string): void {
    this.pendingUserMessages.delete(messageId);
    console.log(`[MessageSaveHandler] Removed pending user message: ${messageId}, remaining: ${this.pendingUserMessages.size}`);
  }
  
  markAsProcessed(role: 'user' | 'assistant', content: string): void {
    // CRITICAL FIX: Validate role
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaveHandler] Invalid role in markAsProcessed: ${role}`);
      return;
    }
    
    const key = `${role}-${content.substring(0, 20)}`;
    this.processedMessages.add(key);
    console.log(`[MessageSaveHandler] Marked as processed: ${role} message with key ${key}, total processed: ${this.processedMessages.size}`);
  }
  
  isDuplicateContent(role: 'user' | 'assistant', content: string): boolean {
    // CRITICAL FIX: Validate role
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaveHandler] Invalid role in isDuplicateContent: ${role}`);
      return false;
    }
    
    const key = `${role}-${content.substring(0, 20)}`;
    const isDuplicate = this.processedMessages.has(key);
    if (isDuplicate) {
      console.log(`[MessageSaveHandler] Detected duplicate ${role} message with key ${key}`);
    }
    return isDuplicate;
  }
  
  resetProcessedMessages(): void {
    const count = this.processedMessages.size;
    this.processedMessages.clear();
    console.log(`[MessageSaveHandler] Reset processed messages tracking (cleared ${count} entries)`);
  }
  
  getActiveMessageSaves(): number {
    return this.activeSaves;
  }
  
  getPendingUserMessages(): number {
    return this.pendingUserMessages.size;
  }
  
  reportPendingMessages(): void {
    if (this.pendingUserMessages.size > 0) {
      console.warn(`[MessageSaveHandler] There are ${this.pendingUserMessages.size} pending user messages that were never completed`);
      console.warn(`[MessageSaveHandler] Pending message IDs: ${Array.from(this.pendingUserMessages).join(', ')}`);
    }
  }
  
  // Content validation
  isValidContent(content: string): boolean {
    const isValid = !!content && content.trim() !== '';
    if (!isValid) {
      console.log(`[MessageSaveHandler] Content validation failed: empty or whitespace-only content`);
    }
    return isValid;
  }
}
