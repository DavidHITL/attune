
import { useCallback } from 'react';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { toast } from '@/components/ui/use-toast';
import { MessageCallback, StatusCallback, SaveMessageCallback } from '@/utils/types';

/**
 * Hook for managing connection to the voice chat service
 */
export const useConnectionManager = (
  chatClientRef: React.MutableRefObject<RealtimeChatClient | null>,
  handleMessageEvent: MessageCallback,
  setStatus: StatusCallback,
  saveMessage: SaveMessageCallback,
  setIsConnected: (isConnected: boolean) => void,
  setIsMicOn: (isMicOn: boolean) => void,
  setVoiceActivityState: (state: any) => void
) => {
  
  const startConversation = useCallback(async () => {
    try {
      // First cleanup any existing connection
      if (chatClientRef.current) {
        console.log("Cleaning up previous chat client instance");
        chatClientRef.current.disconnect();
        chatClientRef.current = null;
      }
      
      console.log("Creating new RealtimeChatClient instance");
      chatClientRef.current = new RealtimeChatClient(
        handleMessageEvent, 
        setStatus,
        saveMessage
      );
      
      console.log("Initializing chat connection");
      await chatClientRef.current.init();
      
      console.log("Connection initialized successfully");
      setIsConnected(true);
      setIsMicOn(true);
      
      // The session.created event will handle showing the context-aware toast
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to the voice assistant",
        variant: "destructive",
      });
    }
  }, [chatClientRef, handleMessageEvent, saveMessage, setStatus, setIsConnected, setIsMicOn]);

  const endConversation = useCallback(() => {
    console.log("Ending conversation");
    if (chatClientRef.current) {
      chatClientRef.current.disconnect();
      chatClientRef.current = null;
    }
    setIsConnected(false);
    setVoiceActivityState(0); // Idle state
    setIsMicOn(false);
    setStatus("Disconnected");
    
    toast({
      title: "Voice assistant deactivated",
      description: "Voice connection closed",
    });
  }, [chatClientRef, setIsConnected, setVoiceActivityState, setIsMicOn, setStatus]);

  return {
    startConversation,
    endConversation
  };
};
