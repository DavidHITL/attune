
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
  private messagesByRole = {
    user: 0,
    assistant: 0
  };
  
  private constructor() {
    // Clear recently saved content cache periodically
    setInterval(() => {
      this.recentlySavedContent.clear();
    }, 60000); // Clear every minute
    
    console.log('[MessageSaveService] Singleton instance initialized');
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
      // Enhanced role validation - critical for database integrity
      // If role is not exactly 'user' or 'assistant', throw an error
      if (message.role !== 'user' && message.role !== 'assistant') {
        console.error(`[MessageSaveService] SECURITY ERROR - Invalid role detected: "${message.role}"`);
        console.error(`[MessageSaveService] Content preview: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`);
        throw new Error(`Invalid role: ${message.role}. Must be 'user' or 'assistant'.`);
      }
      
      // Prevent duplicate saves with a more sophisticated content key that includes role
      const contentKey = `${message.role}:${message.content.substring(0, 100)}`;
      if (this.recentlySavedContent.has(contentKey)) {
        console.log(`[MessageSaveService] Skipping duplicate ${message.role} message`);
        return null;
      }
      
      // Log message attempt with role for debugging
      this.messagesByRole[message.role]++;
      console.log(`[MessageSaveService] Saving ${message.role} message #${this.messagesByRole[message.role]}: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);
      
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
        role: message.role, // Will be either 'user' or 'assistant' due to validation above
        content: message.content,
        conversation_id: message.conversation_id,
        user_id: message.user_id
      };
      
      // Triple-check role before saving - paranoid but necessary
      if (messageToSave.role !== 'user' && messageToSave.role !== 'assistant') {
        throw new Error(`Final validation failed: Invalid role "${messageToSave.role}"`);
      }
      
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
      
      // Verify the role was saved correctly
      if (savedMessage.role !== message.role) {
        console.error(`[MessageSaveService] ❌ CRITICAL ERROR - Role mismatch in saved message. Expected "${message.role}", got "${savedMessage.role}"`);
      } else {
        console.log(`[MessageSaveService] ✅ Successfully saved ${message.role} message with ID: ${savedMessage.id}, SAVED ROLE: ${savedMessage.role}`);
      }
      
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
    // Enforce role validation
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[MessageSaveService] Invalid role check: ${role}`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }
    
    const contentKey = `${role}:${content.substring(0, 100)}`;
    return this.recentlySavedContent.has(contentKey);
  }
  
  /**
   * Get current number of active inserts
   */
  public getActiveInsertsCount(): number {
    return this.activeInserts;
  }
  
  /**
   * Get stats about saved messages
   */
  public getMessageStats(): {user: number, assistant: number} {
    return {...this.messagesByRole};
  }
}

// Export the singleton instance for easy importing
export const messageSaveService = MessageSaveService.getInstance();
