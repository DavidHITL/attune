
import { useAuth } from '@/context/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useConversationValidator = () => {
  const { user } = useAuth();
  const { conversationId } = useConversation();
  
  const validateConversationContext = useCallback(() => {
    // For authenticated users, require both user and conversationId
    if (user) {
      const isValid = !!user && !!conversationId;
      
      if (!isValid) {
        // Only log errors for authenticated users
        console.error('⚠️ Invalid conversation context for authenticated user:', {
          hasUser: !!user, 
          hasConversationId: !!conversationId,
          userId: user?.id,
          conversationId,
          timestamp: new Date().toISOString()
        });
        
        // Show error for missing conversation
        if (!conversationId) {
          toast.error("Cannot save message - waiting for conversation initialization");
          
          // Update global context initialization flag
          if (typeof window !== 'undefined' && window.conversationContext) {
            window.conversationContext.isInitialized = false;
          }
          
          return false;
        }
      }
      
      return isValid;
    }
    
    // For anonymous users, we're more permissive - log but continue
    if (!user) {
      console.log('👤 Anonymous user detected - conversation validation bypassed');
      return true; // Allow anonymous users to proceed
    }
    
    return true;
  }, [user, conversationId]);
  
  return { 
    user, 
    conversationId,
    validateConversationContext
  };
};
