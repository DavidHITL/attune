
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';

/**
 * Helper functions for conversation operations
 */
export const useConversationHelpers = () => {
  /**
   * Validates role without overriding 
   * CRITICAL FIX: Prevent role overrides particularly for assistant role
   */
  const validateRole = (role: string): 'user' | 'assistant' => {
    console.log(`[validateRole] 🔍 Role validation requested for: "${role}"`);
    
    // Trim and convert to lowercase for consistent comparison
    const normalizedRole = role?.trim().toLowerCase();
    
    if (normalizedRole === 'user') {
      console.log(`[validateRole] ✅ Valid USER role confirmed`);
      return 'user';
    }
    
    if (normalizedRole === 'assistant') {
      console.log(`[validateRole] ✅ Valid ASSISTANT role confirmed`);
      return 'assistant';
    }
    
    // If role is invalid, log error and throw - this prevents silent corruption
    console.error(`[validateRole] ❌ INVALID ROLE: "${role}". Must be 'user' or 'assistant'.`);
    throw new Error(`Invalid role: "${role}". Expected 'user' or 'assistant'.`);
  };

  /**
   * Loads messages for a given conversation ID
   */
  const loadMessages = async (convoId: string): Promise<Message[]> => {
    try {
      console.log(`Loading messages for conversation: ${convoId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }
      
      // Convert database results to Message type with proper role validation and error handling
      const validMessages: Message[] = [];
      
      if (data && data.length > 0) {
        for (const item of data) {
          try {
            validMessages.push({
              id: item.id,
              role: validateRole(item.role),
              content: item.content,
              created_at: item.created_at
            });
          } catch (validationError) {
            console.error(`Skipping message ${item.id} due to validation error:`, validationError);
            // Don't add invalid messages to the result array
          }
        }
      }
      
      console.log(`Loaded ${validMessages.length} messages from database`);
      if (validMessages.length > 0) {
        console.log("First message:", validMessages[0].content.substring(0, 30) + "...");
        console.log("Last message:", validMessages[validMessages.length - 1].content.substring(0, 30) + "...");
        
        // Log message pairs to check conversation flow
        console.log("--- CONVERSATION FLOW CHECK ---");
        let userCount = 0;
        let assistantCount = 0;
        
        validMessages.forEach((msg, i) => {
          if (msg.role === 'user') userCount++;
          else assistantCount++;
          
          console.log(`[${i+1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 30)}...`);
        });
        
        console.log(`Summary: ${userCount} user messages, ${assistantCount} assistant messages`);
        console.log("--- END FLOW CHECK ---");
      }
      
      return validMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  };

  return {
    validateRole,
    loadMessages
  };
};
