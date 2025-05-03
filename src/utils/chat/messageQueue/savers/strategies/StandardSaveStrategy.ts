
import { Message } from '@/utils/types';
import { SaveStrategy } from './SaveStrategy';
import { ContentValidator } from '../validators/ContentValidator';
import { RoleValidator } from '../validators/RoleValidator';
import { ContentProcessor } from '../processors/ContentProcessor';
import { MessageTracker } from '../trackers/MessageTracker';
import { toast } from 'sonner';
import { messageSaveService } from '@/utils/chat/messaging/MessageSaveService';

/**
 * Standard strategy for saving messages
 */
export class StandardSaveStrategy implements SaveStrategy {
  private contentValidator = new ContentValidator();
  private roleValidator = new RoleValidator();
  private contentProcessor = new ContentProcessor();
  private messageTracker = new MessageTracker();
  
  /**
   * Save a message with validation
   */
  async saveMessage(
    role: 'user' | 'assistant',
    content: string,
    options: {
      messageId?: string;
      maxRetries?: number;
      showNotification?: boolean;
    } = {}
  ): Promise<Message | null> {
    const { messageId, showNotification = false } = options;
    
    try {
      // Validate role
      if (!this.roleValidator.isValidRole(role)) {
        console.error(`[StandardSaveStrategy] Invalid role: ${role}`);
        throw this.roleValidator.createInvalidRoleError(role);
      }
      
      // Validate content
      if (!this.contentValidator.isValidContent(content)) {
        console.log(`[StandardSaveStrategy] Skipping empty ${role} message`);
        return null;
      }
      
      // Check for duplicates
      if (this.contentProcessor.isDuplicate(role, content)) {
        console.log(`[StandardSaveStrategy] Skipping duplicate ${role} message: ${content.substring(0, 30)}...`);
        return null;
      }
      
      // Track this message
      this.contentProcessor.markAsProcessed(role, content);
      this.messageTracker.incrementActiveSaves();
      
      if (messageId) {
        this.messageTracker.trackMessage(messageId);
      }
      
      try {
        // Use the central message save service
        console.log(`[StandardSaveStrategy] Saving ${role} message: ${content.substring(0, 30)}...`);
        
        const savedMessage = await messageSaveService.saveMessageToDatabase({
          role,
          content
        });
        
        if (messageId) {
          this.messageTracker.untrackMessage(messageId);
        }
        
        if (showNotification && savedMessage) {
          toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
            duration: 2000,
          });
        }
        
        return savedMessage;
      } catch (error) {
        console.error(`[StandardSaveStrategy] Error saving ${role} message:`, error);
        
        if (showNotification) {
          toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 3000,
          });
        }
        
        throw error;
      }
    } catch (error) {
      console.error('[StandardSaveStrategy] Save error:', error);
      throw error;
    } finally {
      this.messageTracker.decrementActiveSaves();
    }
  }
  
  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.messageTracker.getPendingCount();
  }
  
  /**
   * Get active saves count
   */
  getActiveSavesCount(): number {
    return this.messageTracker.getActiveSavesCount();
  }
  
  /**
   * Reset processed messages tracking
   */
  resetProcessedTracking(): void {
    this.contentProcessor.reset();
  }
  
  /**
   * Report any pending messages
   */
  reportPendingMessages(): void {
    this.messageTracker.reportPendingMessages();
  }
}
