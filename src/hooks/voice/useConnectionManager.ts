
import { useCallback } from 'react';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { MessageCallback, StatusCallback, SaveMessageCallback } from '@/utils/types';
import { toast } from 'sonner';

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
      console.log("Starting conversation, creating chat client...");
      
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
      toast.success("Connected successfully!");
      
      // The session.created event will handle showing the context-aware toast
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error("Failed to connect. Please try again.");
      setIsConnected(false);
      setIsMicOn(false);
    }
  }, [chatClientRef, handleMessageEvent, saveMessage, setStatus, setIsConnected, setIsMicOn]);

  const endConversation = useCallback(() => {
    console.log("Ending conversation");
    if (chatClientRef.current) {
      // Make sure we properly disconnect and clean up resources
      chatClientRef.current.disconnect();
      chatClientRef.current = null;
    }
    
    // Reset all states
    setIsConnected(false);
    setVoiceActivityState(0); // Idle state
    setIsMicOn(false);
    setStatus("Disconnected");
    
    // Force releasing microphone
    try {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop all tracks to ensure microphone is fully released
          stream.getTracks().forEach(track => {
            track.stop();
          });
        })
        .catch(err => console.error("Error accessing microphone during cleanup:", err));
    } catch (e) {
      console.error("Error during forced microphone cleanup:", e);
    }
  }, [chatClientRef, setIsConnected, setVoiceActivityState, setIsMicOn, setStatus]);

  return {
    startConversation,
    endConversation
  };
};
