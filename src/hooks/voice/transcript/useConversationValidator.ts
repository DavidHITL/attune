
import { useAuth } from '@/context/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { toast } from 'sonner';

export const useConversationValidator = () => {
  const { user } = useAuth();
  const { conversationId } = useConversation();

  const validateConversationContext = () => {
    if (!user) {
      console.warn("⚠️ Can't save message: No authenticated user");
      toast.error("Sign in to save your messages");
      return false;
    }
    
    if (!conversationId) {
      console.warn("⚠️ Can't save message: No conversation ID");
      toast.error("No active conversation");
      return false;
    }

    return true;
  };

  return {
    validateConversationContext,
    user,
    conversationId
  };
};
