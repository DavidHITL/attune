
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateConversationId } from "@/hooks/useConversationId";
import { Message } from "@/utils/types";
import { toast } from "sonner";

/**
 * Service for saving messages to the database with conversation context
 */
export class MessageSaver {
  /**
   * Save a message to the database with the current user's conversation
   */
  async saveMessage(
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message | null> {
    try {
      console.log(`[MessageSaver] Saving ${role} message: ${content.substring(0, 30)}...`);
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[MessageSaver] No authenticated user found, cannot save message');
        return null;
      }
      
      // Get or create a conversation ID for this user
      const conversationId = await getOrCreateConversationId(user.id);
      
      console.log(`[MessageSaver] Using conversation ID: ${conversationId}`);
      
      // Insert the message into the database
      const { data: savedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role,           // 'user' | 'assistant'
          content
        })
        .select("*")
        .single();
      
      if (error) {
        console.error('[MessageSaver] Error saving message:', error);
        toast.error("Failed to save message to database");
        throw error;
      }
      
      console.log(`[MessageSaver] Successfully saved ${role} message with ID: ${savedMessage.id}`);
      
      return savedMessage as Message;
    } catch (error) {
      console.error('[MessageSaver] Error in saveMessage:', error);
      throw error;
    }
  }
  
  /**
   * Track a message save attempt
   */
  trackMessageSave(messageId: string): void {
    console.log(`[MessageSaver] Tracking message save: ${messageId}`);
  }
  
  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return 0; // Implementation to be added if needed
  }
  
  /**
   * Report pending messages
   */
  reportPendingMessages(): void {
    console.log('[MessageSaver] Reporting pending messages');
  }
}

// Export a singleton instance
export const messageSaver = new MessageSaver();
