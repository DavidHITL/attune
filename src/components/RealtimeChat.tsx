
import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/RealtimeAudio';
import CallControls from '@/components/CallControls';

const RealtimeChat: React.FC = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  
  useEffect(() => {
    // Clean up on component unmount
    return () => {
      chatClientRef.current?.disconnect();
    };
  }, []);

  const handleMessageEvent = (event: any) => {
    console.log("Handling message event:", event);
    
    if (event.type === 'response.audio.delta') {
      // Audio is playing
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      // Audio finished playing
      setIsSpeaking(false);
    } else if (event.type === 'session.created') {
      toast({
        title: "Connected to Voice AI",
        description: "Start speaking to interact with the AI",
      });
    }
  };

  const startConversation = async () => {
    try {
      if (chatClientRef.current) {
        chatClientRef.current.disconnect();
      }
      
      chatClientRef.current = new RealtimeChatClient(
        handleMessageEvent, 
        (newStatus) => setStatus(newStatus)
      );
      
      await chatClientRef.current.init();
      setIsConnected(true);
      setIsMicOn(true);
      
      toast({
        title: "Voice assistant active",
        description: "Speak to interact with the AI",
      });
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
    chatClientRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
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
      // Here you would add logic to actually mute the microphone input
      // This would need to be implemented in the RealtimeAudio.ts utility
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would add logic to actually mute the audio output
    // This would need to be implemented in the RealtimeAudio.ts utility
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status indicator */}
      <div className="text-center text-attune-purple mb-8 mt-4">
        <div className="text-xl font-semibold mb-2">
          {isConnected ? "Voice Assistant Active" : "Voice Assistant"}
        </div>
        <div className="text-sm">
          Status: {status} {isSpeaking && " (Speaking...)"}
        </div>
      </div>
      
      {/* Voice interaction instructions */}
      {!isConnected && (
        <div className="text-center mb-12 text-attune-purple/80">
          <p>Press the microphone button below to start a voice conversation with the AI assistant.</p>
        </div>
      )}
      
      {isConnected && (
        <div className="text-center mb-12 text-attune-purple/80">
          <p>Speak naturally to interact with the AI. The assistant will listen and respond with voice.</p>
        </div>
      )}

      {/* Call controls */}
      <div className="flex justify-center mt-auto mb-8">
        {!isConnected ? (
          <div 
            onClick={startConversation}
            className="w-20 h-20 rounded-full bg-attune-blue/20 border-none shadow-lg hover:bg-attune-blue/30 transition-all cursor-pointer flex items-center justify-center"
          >
            <div className="h-10 w-10 text-attune-purple">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
          </div>
        ) : (
          <CallControls
            isMicOn={isMicOn}
            isMuted={isMuted}
            onToggleMic={toggleMicrophone}
            onToggleMute={toggleMute}
            onEndCall={endConversation}
          />
        )}
      </div>
    </div>
  );
};

export default RealtimeChat;
