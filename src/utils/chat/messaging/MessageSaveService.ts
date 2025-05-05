
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/utils/types";
import { toast } from "sonner";

/**
 * Central service for saving messages to the database
 * This is the ONLY place where direct inserts to the messages table should occur
 */
export class MessageSaveService {
  private static instance: MessageSaveService;
  private activeInserts = 0;
  private recentlySavedContent = new Set<string>();
  
  private constructor() {
    // Clear recently saved content cache periodically
    setInterval(() => {
      this.recentlySavedContent.clear();
    }, 60000); // Clear every minute
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MessageSaveService {
    if (!MessageSaveService.instance) {
      MessageSaveService.instance = new MessageSaveService();
    }
    return MessageSaveService.instance;
  }
  
  /**
   * Central function to save a message to the database
   * ALL message inserts should go through this function
   */
  public async saveMessageToDatabase(
    message: { role: 'user' | 'assistant'; content: string; conversation_id?: string; user_id?: string }
  ): Promise<Message | null> {
    try {
      // Strict role validation - critical for database integrity
      if (message.role !== 'user' && message.role !== 'assistant') {
        throw new Error(`Invalid role: ${message.role}. Must be 'user' or 'assistant'.`);
      }
      
      // Prevent duplicate saves with a simple content key
      const contentKey = `${message.role}:${message.content.substring(0, 100)}`;
      if (this.recentlySavedContent.has(contentKey)) {
        console.log(`[MessageSaveService] Skipping duplicate ${message.role} message`);
        return null;
      }
      
      // Mark as being processed
      this.recentlySavedContent.add(contentKey);
      this.activeInserts++;
      
      // Get conversation ID from global context if not provided
      if (!message.conversation_id && typeof window !== 'undefined' && window.__attuneConversationId) {
        message.conversation_id = window.__attuneConversationId;
      }
      
      // Get user ID if not provided
      if (!message.user_id) {
        const { data } = await supabase.auth.getUser();
        message.user_id = data?.user?.id;
      }
      
      // CRITICAL: Check if we have the required conversation_id
      if (!message.conversation_id) {
        toast.error("Cannot save message - no conversation ID");
        throw new Error("Missing conversation_id");
      }
      
      // Create a clean message object with validated role
      const messageToSave = {
        role: message.role,
        content: message.content,
        conversation_id: message.conversation_id,
        user_id: message.user_id
      };
      
      console.log(`[MessageSaveService] Saving ${message.role} message: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}" to conversation ${message.conversation_id}`);
      
      // Perform database insert
      const { data: savedMessage, error } = await supabase
        .from("messages")
        .insert(messageToSave)
        .select("*")
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!savedMessage) {
        throw new Error("Failed to save message");
      }
      
      console.log(`[MessageSaveService] Successfully saved ${message.role} message with ID: ${savedMessage.id}`);
      
      return savedMessage as Message;
    } catch (error) {
      console.error(`[MessageSaveService] Error saving ${message?.role || 'unknown'} message:`, error);
      throw error;
    } finally {
      this.activeInserts--;
    }
  }
  
  /**
   * Check if message is being processed to prevent duplicates
   */
  public isMessageBeingProcessed(role: 'user' | 'assistant', content: string): boolean {
    const contentKey = `${role}:${content.substring(0, 100)}`;
    return this.recentlySavedContent.has(contentKey);
  }
  
  /**
   * Get current number of active inserts
   */
  public getActiveInsertsCount(): number {
    return this.activeInserts;
  }
}

// Export the singleton instance for easy importing
export const messageSaveService = MessageSaveService.getInstance();
