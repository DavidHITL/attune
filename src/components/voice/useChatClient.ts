
import { useRef, useCallback, useEffect } from 'react';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { useVoiceActivityState } from '@/hooks/voice/useVoiceActivityState';
import { useContextStatus } from '@/hooks/voice/useContextStatus';
import { useMicrophoneControls } from '@/hooks/voice/useMicrophoneControls';
import { useConnectionManager } from '@/hooks/voice/useConnectionManager';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export const useChatClient = () => {
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const { user } = useAuth();
  const { saveMessage, messages, conversationId } = useConversation();
  
  // Create a debug logging flag for message saving
  useEffect(() => {
    console.log("Voice page loaded. Auth status:", { 
      userLoggedIn: !!user, 
      userId: user?.id,
      conversationId: conversationId || 'none',
      messageCount: messages.length
    });
    
    if (!user) {
      console.warn("User not authenticated! Messages won't be saved to database.");
      toast.warning("Please log in to save your conversation", { duration: 5000 });
    } else if (!conversationId) {
      console.warn("No active conversation ID! Messages won't be saved to database.");
    } else {
      console.log("Voice chat ready with conversation ID:", conversationId);
      toast.info("Voice chat initialized", { 
        description: `Using conversation: ${conversationId}`,
        duration: 2000
      });
    }
  }, [user, conversationId, messages.length]);
  
  // Use our new custom hooks
  const { voiceActivityState, handleMessageEvent } = useVoiceActivityState();
  const { 
    status, setStatus, 
    isConnected, setIsConnected,
    hasContext, messageCount,
    handleSessionCreated, updateMessagesContext
  } = useContextStatus();
  
  // Create a combined message handler
  const combinedMessageHandler = useCallback((event: any) => {
    // Process voice activity state changes
    handleMessageEvent(event);
    
    // Process session creation events
    handleSessionCreated(event);
    
    // Handle transcript events for user messages
    if (event.type === 'transcript' && event.transcript && chatClientRef.current) {
      console.log("Received transcript event, saving user message:", event.transcript);
      
      // Show toast confirmation for transcript received
      toast.info("User speech detected", {
        description: event.transcript.substring(0, 50) + (event.transcript.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (!user) {
        console.warn("Can't save message: No authenticated user");
        toast.error("Sign in to save your messages");
        return;
      }
      
      if (!conversationId) {
        console.warn("Can't save message: No conversation ID");
        toast.error("No active conversation");
        return;
      }
      
      // Save user message when we get a transcript
      chatClientRef.current.saveUserMessage(event.transcript);
      
      // Log key information about conversation state
      console.log("Current conversation ID:", conversationId);
    }
    
    // Also handle response.audio_transcript.done events
    if (event.type === 'response.audio_transcript.done' && event.transcript?.text && chatClientRef.current) {
      console.log("Final transcript received:", event.transcript.text);
      
      // Show toast with transcript
      toast.info("Final transcript received", {
        description: event.transcript.text.substring(0, 50) + (event.transcript.text.length > 50 ? "..." : ""),
        duration: 2000,
      });
      
      if (user && conversationId) {
        // Make sure the final transcript is also saved
        chatClientRef.current.saveUserMessage(event.transcript.text);
      }
    }
  }, [handleMessageEvent, handleSessionCreated, conversationId, user]);
  
  // Initialize connection manager with enhanced message tracking
  const { startConversation, endConversation } = useConnectionManager(
    chatClientRef,
    combinedMessageHandler,
    setStatus,
    (message) => {
      // Enhanced debug logging for message saving
      console.log(`Connection manager saving message: ${message.role} - ${message.content?.substring(0, 30)}...`);
      console.log(`Using conversation ID: ${conversationId}`);
      
      // Show toast for user messages being saved
      if (message.role === 'user') {
        toast.success("Saving user message", {
          description: message.content?.substring(0, 50) + (message.content && message.content.length > 50 ? "..." : ""),
          duration: 2000,
        });
      }
      
      if (!user) {
        console.error("Cannot save message: No authenticated user");
        toast.error("Cannot save message: Not logged in");
        return Promise.reject(new Error("User not authenticated"));
      }
      
      if (!conversationId) {
        console.error("Cannot save message: No conversation ID");
        toast.error("Cannot save message: No conversation");
        return Promise.reject(new Error("No conversation ID"));
      }
      
      return saveMessage(message);
    },
    setIsConnected,
    (isMicOn: boolean) => setIsMicOn(isMicOn),
    (state: VoiceActivityState) => void state
  );
  
  // Initialize microphone controls
  const { 
    isMicOn, setIsMicOn,
    isMuted, setIsMuted,
    toggleMicrophone, toggleMute
  } = useMicrophoneControls(
    chatClientRef,
    isConnected,
    startConversation
  );
  
  // Update context info when messages change
  useEffect(() => {
    updateMessagesContext(messages.length);
    
    // Log message count changes for debugging
    console.log(`Messages updated, now ${messages.length} messages in state`);
    const userMessages = messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
    console.log(`Message breakdown: ${userMessages} user, ${assistantMessages} assistant`);
  }, [messages, updateMessagesContext]);
  
  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (chatClientRef.current) {
        console.log("Component unmounting - disconnecting chat client");
        chatClientRef.current.disconnect();
      }
    };
  }, []);
  
  // Prevent auto-connecting - only connect when user explicitly requests it
  const handleStartConversation = useCallback(() => {
    if (!isConnected) {
      console.log("User initiated conversation start");
      startConversation();
    }
  }, [isConnected, startConversation]);

  return {
    status,
    isConnected,
    voiceActivityState,
    isMicOn,
    isMuted,
    hasContext,
    messageCount,
    startConversation: handleStartConversation,
    endConversation,
    toggleMicrophone,
    toggleMute
  };
};
