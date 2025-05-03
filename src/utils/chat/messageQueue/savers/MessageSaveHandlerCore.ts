
import { SaveMessageCallback } from '../../../types';
import { Message } from '../../../types';
import { RoleValidationHelper } from './validation/RoleValidationHelper';
import { MessageTrackingService } from './tracking/MessageTrackingService';
import { NotificationService } from './notification/NotificationService';
import { RetryManager } from './retry/RetryManager';
import { ContentValidator } from './validators/ContentValidator';
import { messageSaveService } from '../../messaging/MessageSaveService';

/**
 * Core functionality for message saving operations
 */
export class MessageSaveHandlerCore {
  private roleValidator: RoleValidationHelper;
  private messageTracker: MessageTrackingService;
  private notificationService: NotificationService;
  private retryManager: RetryManager;
  private contentValidator: ContentValidator;
  
  constructor(private saveMessageCallback: SaveMessageCallback) {
    this.roleValidator = new RoleValidationHelper();
    this.messageTracker = new MessageTrackingService();
    this.notificationService = new NotificationService();
    this.retryManager = new RetryManager();
    this.contentValidator = new ContentValidator();
    
    console.log('[MessageSaveHandlerCore] Initialized');
  }
  
  /**
   * Save a message directly to the database
   */
  async saveMessageDirectly(role: 'user' | 'assistant', content: string): Promise<Message | null> {
    // Validate role
    if (!this.roleValidator.validateRole(role)) {
      console.error(`[MessageSaveHandlerCore] FATAL ERROR: Invalid role "${role}". Must be 'user' or 'assistant'.`);
      throw this.roleValidator.createInvalidRoleError(role);
    }
    
    // Track message count by role
    const messageCount = this.messageTracker.incrementMessageCounter(role);
    
    try {
      console.log(`[MessageSaveHandlerCore] Direct save attempt for ${role} message #${messageCount}:`, {
        role: role,
        contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
      
      // Create a clean object to avoid reference issues
      const messageObj = {
        role: role,
        content: content
      };
      
      console.log(`[MessageSaveHandlerCore] ⚠️ PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
      
      // Use the central message save service
      const result = await messageSaveService.saveMessageToDatabase(messageObj);
      
      if (result) {
        console.log(`[MessageSaveHandlerCore] ✅ Successfully saved ${role} message #${messageCount} with ID: ${result.id}, FINAL ROLE: ${result.role}`);
        
        if (result.role !== role) {
          console.error(`[MessageSaveHandlerCore] ❌ ROLE MISMATCH DETECTED! Expected="${role}", Actual="${result.role}"`);
        }
      } else {
        console.log(`[MessageSaveHandlerCore] ⚠️ No result returned when saving ${role} message #${messageCount}`);
      }
      
      return result || null;
    } catch (error) {
      console.error(`[MessageSaveHandlerCore] ❌ Direct save failed for ${role} message #${messageCount}:`, error);
      throw error;
    }
  }
  
  /**
   * Content validation
   */
  isValidContent(content: string): boolean {
    return this.contentValidator.isValidContent(content);
  }
  
  /**
   * Access to the tracking service
   */
  get tracking(): MessageTrackingService {
    return this.messageTracker;
  }
  
  /**
   * Access to the notification service
   */
  get notifications(): NotificationService {
    return this.notificationService;
  }
  
  /**
   * Access to the retry manager
   */
  get retry(): RetryManager {
    return this.retryManager;
  }
  
  /**
   * Access to the role validator
   */
  get roleValidation(): RoleValidationHelper {
    return this.roleValidator;
  }
}
