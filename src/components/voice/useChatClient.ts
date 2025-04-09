import { useState, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/chat/RealtimeChat';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import { useConversation } from '@/hooks/useConversation';

export const useChatClient = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  
  const { saveMessage, messages } = useConversation();

  useEffect(() => {
    // Update conversation context indicator when messages change
    setHasContext(messages.length > 0);
    setMessageCount(messages.length);
  }, [messages]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (chatClientRef.current) {
        console.log("Component unmounting - disconnecting chat client");
        chatClientRef.current.disconnect();
      }
    };
  }, []);

  const handleMessageEvent = (event: any) => {
    console.log("Handling message event:", event);
    
    if (event.type === 'response.audio.delta') {
      // Audio is playing (original event - keeping for backward compatibility)
      setVoiceActivityState(VoiceActivityState.Output);
    } else if (event.type === 'response.audio_transcript.delta') {
      // Using transcript delta as indicator that AI is speaking
      setVoiceActivityState(VoiceActivityState.Output);
    } else if (event.type === 'response.audio.done' || event.type === 'response.audio_transcript.done') {
      // Audio finished playing
      setVoiceActivityState(VoiceActivityState.Idle);
    } else if (event.type === 'input_audio_activity_started') {
      // Microphone input is active
      setVoiceActivityState(VoiceActivityState.Input);
    } else if (event.type === 'input_audio_activity_stopped') {
      // Microphone input has stopped
      setVoiceActivityState(VoiceActivityState.Idle);
    } else if (event.type === 'session.created') {
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
    } else if (event.type === 'response.created') {
      // AI has started generating a response
      console.log("AI response started");
      setVoiceActivityState(VoiceActivityState.Output);
    } else if (event.type === 'response.done') {
      // AI has finished generating a response
      console.log("AI response done");
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  };

  const saveMessageToDb = async (role: 'user' | 'assistant', content: string): Promise<void> => {
    if (!content || content.trim() === '') {
      console.log(`Empty ${role} message, not saving to database`);
      return;
    }
    
    try {
      console.log(`Saving ${role} message to database: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      await saveMessage({ role, content });
      console.log(`Successfully saved ${role} message to database`);
    } catch (error) {
      console.error("Failed to save message:", error);
      throw error; // Let the caller handle the retry logic
    }
  };

  const startConversation = async () => {
    try {
      if (chatClientRef.current) {
        chatClientRef.current.disconnect();
      }
      
      chatClientRef.current = new RealtimeChatClient(
        handleMessageEvent, 
        (newStatus) => setStatus(newStatus),
        saveMessageToDb // Pass the save message callback
      );
      
      await chatClientRef.current.init();
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
  };

  const endConversation = () => {
    console.log("Ending conversation");
    chatClientRef.current?.disconnect();
    setIsConnected(false);
    setVoiceActivityState(VoiceActivityState.Idle);
    setIsMicOn(false);
    setStatus("Disconnected");
    
    toast({
      title: "Voice assistant deactivated",
      description: "Voice connection closed",
    });
  };

  const toggleMicrophone = () => {
    if (!isConnected) {
      startConversation();
    } else {
      setIsMicOn(!isMicOn);
      if (chatClientRef.current) {
        // Toggle microphone state in the RealtimeAudio utility
        if (isMicOn) {
          chatClientRef.current.pauseMicrophone();
        } else {
          chatClientRef.current.resumeMicrophone();
        }
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (chatClientRef.current) {
      // Toggle audio output mute state in the RealtimeAudio utility
      chatClientRef.current.setMuted(!isMuted);
    }
  };

  return {
    status,
    isConnected,
    voiceActivityState,
    isMicOn,
    isMuted,
    hasContext,
    messageCount,
    startConversation,
    endConversation,
    toggleMicrophone,
    toggleMute
  };
};
