
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume, VolumeX } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/RealtimeAudio';

const RealtimeChat: React.FC = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    setStatus("Disconnected");
    
    toast({
      title: "Voice assistant deactivated",
      description: "Voice connection closed",
    });
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
          <Button
            onClick={startConversation}
            variant="outline"
            size="icon"
            className="w-20 h-20 rounded-full bg-attune-blue/20 border-none hover:bg-attune-blue/30 transition-all"
          >
            <Mic className="h-10 w-10 text-attune-purple" strokeWidth={2} />
          </Button>
        ) : (
          <div className="flex gap-12">
            <Button
              onClick={endConversation}
              variant="outline"
              size="icon"
              className="w-20 h-20 rounded-full bg-attune-blue/20 border-none hover:bg-attune-blue/30 transition-all"
            >
              <MicOff className="h-10 w-10 text-attune-purple" strokeWidth={2} />
            </Button>
            
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-attune-purple/20 animate-pulse' : 'bg-attune-blue/20'} transition-all`}
            >
              {isSpeaking ? (
                <Volume className="h-10 w-10 text-attune-purple" strokeWidth={2} />
              ) : (
                <VolumeX className="h-10 w-10 text-attune-purple/50" strokeWidth={2} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeChat;
