
import { useState, useCallback, useEffect } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { toast } from 'sonner';

/**
 * Hook for managing voice chat state
 */
export const useVoiceStateManagement = () => {
  // Core state variables
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
  const [hasContext, setHasContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  // Update message context information
  const updateMessagesContext = useCallback((messagesLength: number) => {
    setHasContext(messagesLength > 0);
    setMessageCount(messagesLength);
    console.log(`Voice state updated: ${messagesLength} messages in context`);
  }, []);

  // Handle session creation events
  const handleSessionCreated = useCallback((event: any) => {
    if (event.type === 'session.created') {
      // Update context information from the response
      if (event.hasHistory !== undefined) {
        setHasContext(event.hasHistory);
        setMessageCount(event.messageCount || 0);
        console.log(`Session created with ${event.messageCount || 0} messages in history`);
      }
    }
  }, []);

  return {
    // State
    status,
    setStatus,
    isConnected, 
    setIsConnected,
    voiceActivityState,
    setVoiceActivityState,
    hasContext,
    messageCount,
    
    // Functions
    updateMessagesContext,
    handleSessionCreated
  };
};
