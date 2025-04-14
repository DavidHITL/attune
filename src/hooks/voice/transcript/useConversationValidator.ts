
import { useAuth } from '@/context/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useConversationValidator = () => {
  const { user } = useAuth();
  const { conversationId } = useConversation();
  
  const validateConversationContext = useCallback(() => {
    const isValid = !!user && !!conversationId;
    
    if (!isValid) {
      // Log specifics for debugging
      console.error('⚠️ Invalid conversation context:', {
        hasUser: !!user, 
        hasConversationId: !!conversationId,
        userId: user?.id,
        conversationId,
        timestamp: new Date().toISOString()
      });
      
      // Show error for missing user or conversation
      if (!user) {
        toast.error("Cannot save message - not logged in");
      } else if (!conversationId) {
        toast.error("Cannot save message - no active conversation");
      }
    }
    
    return isValid;
  }, [user, conversationId]);
  
  return { 
    user, 
    conversationId,
    validateConversationContext
  };
};
