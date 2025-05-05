
import { Message } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Centralized service for saving messages to the database
 * This provides a unified code path for all message saving
 */
class MessageSaveService {
  private pendingMessages: Set<string> = new Set();
  private activeMessageSaves: number = 0;
  private processedFingerprints: Set<string> = new Set();
  
  /**
   * Save a message to the database with the current user's conversation
   */
  async saveMessageToDatabase({
    role,
    content,
    conversation_id,
    user_id
  }: {
    role: 'user' | 'assistant',
    content: string,
    conversation_id?: string,
    user_id?: string
  }): Promise<Message | null> {
    try {
      // Validate role and content
      if (role !== 'user' && role !== 'assistant') {
        throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
      }
      
      if (!content || content.trim() === '') {
        throw new Error('Cannot save empty message content');
      }
      
      // Check for duplicates with fingerprinting
      const contentFingerprint = `${role}:${content.substring(0, 100)}`;
      if (this.processedFingerprints.has(contentFingerprint)) {
        console.log(`[MessageSaveService] Skipping duplicate ${role} message`);
        return null;
      }
      
      // Track this fingerprint to prevent duplicates
      this.processedFingerprints.add(contentFingerprint);
      
      console.log(`[MessageSaveService] Saving ${role} message: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"${conversation_id ? ` for conversation ${conversation_id}` : ''}`);
      
      // Create a unique ID for tracking this message save attempt
      const messageTrackingId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.pendingMessages.add(messageTrackingId);
      this.activeMessageSaves++;
      
      // Get authenticated user if not provided
      let targetUserId = user_id;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        targetUserId = user?.id;
      }
      
      // Get or create a conversation ID for this user if not provided
      let targetConversationId = conversation_id;
      if (!targetConversationId && targetUserId) {
        try {
          const { data, error } = await supabase.rpc(
            "get_or_create_conversation", 
            { p_user_id: targetUserId }
          );
          
          if (error) {
            throw error;
          }
          
          targetConversationId = data;
          
          // Set global conversation ID for use by other components
          if (typeof window !== 'undefined') {
            window.__attuneConversationId = targetConversationId;
            
            // Also update conversation context if available
            if (window.conversationContext) {
              window.conversationContext.conversationId = targetConversationId;
              window.conversationContext.isInitialized = true;
            }
          }
        } catch (err) {
          console.error('[MessageSaveService] Error getting/creating conversation:', err);
          throw err;
        }
      }
      
      // Insert the message into the database
      const insertPayload = {
        conversation_id: targetConversationId,
        role, // 'user' | 'assistant'
        content
      };
      
      // Only add user_id if defined
      if (targetUserId) {
        Object.assign(insertPayload, { user_id: targetUserId });
      }
      
      const { data: savedMessage, error } = await supabase
        .from('messages')
        .insert(insertPayload)
        .select("*")
        .single();
      
      // Clean up tracking
      this.pendingMessages.delete(messageTrackingId);
      this.activeMessageSaves--;
      
      if (error) {
        console.error('[MessageSaveService] Error saving message:', error);
        
        // Show error toast only if it's not a duplicate
        if (!error.message.includes('duplicate') && !error.message.includes('unique constraint')) {
          toast.error("Failed to save message to database", {
            description: error.message
          });
        }
        throw error;
      }
      
      console.log(`[MessageSaveService] Successfully saved ${role} message with ID: ${savedMessage.id}`);
      
      return savedMessage as Message;
    } catch (error) {
      console.error('[MessageSaveService] Error in saveMessage:', error);
      
      // Update tracking counters on error
      this.activeMessageSaves = Math.max(0, this.activeMessageSaves - 1);
      
      // Only show toast for real errors (not dupes)
      if (error instanceof Error && 
          !error.message.includes('duplicate') && 
          !error.message.includes('unique constraint')) {
        toast.error("Error saving message", {
          description: error.message
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Track a message save attempt
   */
  trackMessageSave(messageId: string): void {
    this.pendingMessages.add(messageId);
    this.activeMessageSaves++;
  }
  
  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }
  
  /**
   * Get active message saves count
   */
  getActiveMessageSaves(): number {
    return this.activeMessageSaves;
  }
  
  /**
   * Clear processed fingerprints
   */
  clearProcessedFingerprints(): void {
    this.processedFingerprints.clear();
  }
}

// Export singleton instance
export const messageSaveService = new MessageSaveService();
