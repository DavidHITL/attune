
import { toast } from 'sonner';

/**
 * Manages notifications for message saving operations
 */
export class SaveNotifier {
  /**
   * Show notification for saving start
   */
  notifySaving(messageId: string): void {
    toast.loading('Saving message...', {
      id: messageId,
      duration: 3000,
    });
  }
  
  /**
   * Show notification for save success
   */
  notifySaveSuccess(role: 'user' | 'assistant', content: string, messageId?: string): void {
    const message = role === 'user' ? 'Message saved' : 'Response saved';
    
    toast.success(message, {
      id: messageId,
      description: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      duration: 2000,
    });
  }
  
  /**
   * Show notification for save error
   */
  notifySaveError(role: 'user' | 'assistant', error: Error, messageId?: string): void {
    const message = role === 'user' ? 'Failed to save message' : 'Failed to save response';
    
    toast.error(message, {
      id: messageId,
      description: error.message || 'Unknown error',
      duration: 4000,
    });
  }
  
  /**
   * Show notification for retry
   */
  notifyRetry(attempt: number, maxAttempts: number, messageId?: string): void {
    toast.loading(`Retrying save (${attempt}/${maxAttempts})...`, {
      id: messageId,
      duration: 2000,
    });
  }
}
