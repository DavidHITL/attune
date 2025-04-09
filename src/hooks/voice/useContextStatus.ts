
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook for managing connection status and context information
 */
export const useContextStatus = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const handleSessionCreated = useCallback((event: any) => {
    if (event.type === 'session.created') {
      // Update context information from the response
      if (event.hasHistory !== undefined) {
        setHasContext(event.hasHistory);
        setMessageCount(event.messageCount || 0);
      }
      
      let toastMessage = "Connected to Voice AI";
      let toastDescription = event.hasHistory ? 
        `The assistant remembers your previous ${event.messageCount || ''} message conversation.` : 
        "Start speaking to interact with the AI";
      
      toast({
        title: toastMessage,
        description: toastDescription,
      });
    }
  }, []);

  const updateMessagesContext = useCallback((messagesLength: number) => {
    setHasContext(messagesLength > 0);
    setMessageCount(messagesLength);
  }, []);

  return {
    status,
    setStatus,
    isConnected,
    setIsConnected,
    hasContext,
    setHasContext,
    messageCount,
    setMessageCount,
    handleSessionCreated,
    updateMessagesContext
  };
};
