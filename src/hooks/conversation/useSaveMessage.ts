import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/utils/types';
import { toast } from 'sonner';
import { normalizeMessageRole, ensureValidMessageRole } from '@/utils/chat/messageUtils';

/**
 * Hook for saving messages to the database
 */
export const useSaveMessage = (
  user: any, 
  conversationId: string | null,
  validateRole: (role: string) => 'user' | 'assistant'
) => {
  const saveMessage = async (message: Partial<Message>): Promise<Message | null> => {
    // Use utility to ensure valid role
    const normalizedMessage = ensureValidMessageRole(message);
    
    console.log('Normalized message role:', normalizedMessage.role);
    
    console.log('useSaveMessage called with:', {
      userExists: !!user,
      userId: user?.id,
      conversationId,
      messageRole: normalizedMessage.role,
      messageContentLength: normalizedMessage.content?.length,
      userAuthenticated: !!supabase.auth.getSession()
    });
    
    // Don't save empty messages regardless of user status
    if (!normalizedMessage.content || normalizedMessage.content.trim() === '') {
      console.warn('Skipping empty message save attempt');
      return null;
    }
    
    // ANONYMOUS MODE HANDLING:
    // If no user or conversation ID, return a simulated message object
    // This allows the UI to function without database persistence
    if (!user || !conversationId) {
      console.log(`👤 Anonymous user message processing: ${normalizedMessage.role} - ${normalizedMessage.content?.substring(0, 30)}...`);
      
      // Create a simulated message that the UI can use
      const simulatedMessage: Message = {
        id: `anon-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9)}`,
        role: normalizedMessage.role,
        content: normalizedMessage.content,
        created_at: new Date().toISOString()
      };
      
      console.log("👤 Created simulated message for anonymous user:", simulatedMessage.id);
      return simulatedMessage;
    }
    
    try {
      // Show more visible logging for user messages
      if (normalizedMessage.role === 'user') {
        console.log(`🔴 SAVING USER MESSAGE to conversation ${conversationId}: ${normalizedMessage.content?.substring(0, 30)}...`);
        toast.info("Saving user message to database", {
          description: normalizedMessage.content?.substring(0, 50) + (normalizedMessage.content && normalizedMessage.content.length > 50 ? "..." : ""),
          duration: 2000,
        });
      } else {
        console.log(`Saving message to conversation ${conversationId}: ${normalizedMessage.role} - ${normalizedMessage.content?.substring(0, 30)}...`);
      }
      
      // Add explicit log of the full data being inserted
      const insertData = {
        conversation_id: conversationId,
        user_id: user.id,
        role: normalizedMessage.role,
        content: normalizedMessage.content
      };
      console.log('Insert data:', JSON.stringify(insertData));
      
      // Try to get current session for debugging
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current session status:', sessionData.session ? 'Active' : 'No session');
      
      // Add more retry logic specifically for user messages
      let retries = 0;
      const maxRetries = normalizedMessage.role === 'user' ? 3 : 1;
      let lastError: any = null;
      
      while (retries <= maxRetries) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .insert([insertData])
            .select('id, role, content, created_at')
            .single();
          
          if (error) {
            lastError = error;
            throw error;
          }
          
          // Add the new message to the state with validated role
          const validatedMessage: Message = {
            id: data.id,
            role: validateRole(data.role),
            content: data.content,
            created_at: data.created_at
          };
          
          console.log(`Message saved successfully with ID: ${validatedMessage.id}`);
          
          // Show success toast for user messages with ID
          if (normalizedMessage.role === 'user') {
            toast.success(`User message saved with ID: ${validatedMessage.id.substring(0, 8)}...`, {
              id: `save-success-${validatedMessage.id}`,
              duration: 2000,
            });
          }
          
          // Verify message was saved correctly
          const { data: verifyData, error: verifyError } = await supabase
            .from('messages')
            .select('id, role, content')
            .eq('id', validatedMessage.id)
            .single();
            
          if (verifyError) {
            console.error('Error verifying message was saved:', verifyError);
          } else {
            console.log('Verified message in database:', verifyData);
            if (verifyData.content !== normalizedMessage.content) {
              console.warn('Message content verification mismatch!');
              console.warn('Original:', normalizedMessage.content?.substring(0, 50));
              console.warn('Saved:', verifyData.content.substring(0, 50));
            }
          }
          
          return validatedMessage;
        } catch (error) {
          retries++;
          lastError = error;
          
          if (retries > maxRetries) {
            console.error(`Failed to save ${normalizedMessage.role} message after ${maxRetries} attempts:`, error);
            break;
          }
          
          console.log(`Retry ${retries}/${maxRetries} for saving ${normalizedMessage.role} message...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      
      // If all retries failed, throw the last error
      throw lastError;
    } catch (error) {
      console.error('Error saving message:', error);
      
      // Show error toast
      toast.error(`Failed to save ${normalizedMessage.role} message: ${error instanceof Error ? error.message : "Unknown error"}`, {
        id: `save-error-${Date.now()}`,
        duration: 4000,
      });
      
      // Create a temporary message with a generated ID so UI remains consistent
      const tempMessage: Message = {
        id: `temp-${new Date().getTime()}`,
        role: normalizedMessage.role,
        content: normalizedMessage.content || '',
        created_at: new Date().toISOString()
      };
      
      console.log(`Created temporary message for ${normalizedMessage.role} due to save error`);
      return tempMessage;
    }
  };

  return { saveMessage };
};
