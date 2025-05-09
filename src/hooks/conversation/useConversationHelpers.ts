
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';

/**
 * Helper functions for conversation operations
 */
export const useConversationHelpers = () => {
  /**
   * Validates and converts role to proper type
   * CRITICAL FIX: Complete rewrite that forces valid roles and throws errors for invalid ones
   */
  const validateRole = (role: string): 'user' | 'assistant' => {
    // Normalize input to prevent case-sensitivity issues
    const normalizedRole = (role || '').trim().toLowerCase();
    
    // CRITICAL CHECK: Only allow 'user' and 'assistant' roles
    if (normalizedRole === 'user') {
      return 'user';
    }
    
    if (normalizedRole === 'assistant') {
      return 'assistant';
    }
    
    // Instead of silently defaulting, throw an error to make problems visible
    console.error(`[validateRole] CRITICAL ERROR: "${role}" is not a valid role`);
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
      
      // Convert database results to Message type with proper role validation
      const validMessages: Message[] = [];
      
      if (data && data.length > 0) {
        for (const item of data) {
          try {
            // Only validate roles that need to be normalized
            let role: 'user' | 'assistant';
            if (item.role === 'user' || item.role === 'assistant') {
              role = item.role;
            } else {
              role = validateRole(item.role);
            }
            
            validMessages.push({
              id: item.id,
              role: role,
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
