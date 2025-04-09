
import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/RealtimeAudio';
import CallControls from '@/components/CallControls';
import VoiceActivityIndicator, { VoiceActivityState } from './VoiceActivityIndicator';

const RealtimeChat: React.FC = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
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
      toast({
        title: "Connected to Voice AI",
        description: "Start speaking to interact with the AI",
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

  return (
    <div className="flex flex-col h-full">
      {/* Voice activity visualization - always visible with fixed position */}
      <div className="flex flex-col items-center justify-center flex-grow">
        {/* Voice activity indicator - always visible, but larger when connected */}
        <div className="flex justify-center items-center my-8 h-32">
          {isConnected ? (
            <div className="scale-150 transform transition-all duration-300">
              <VoiceActivityIndicator state={voiceActivityState} />
            </div>
          ) : (
            <VoiceActivityIndicator state={voiceActivityState} />
          )}
        </div>
      </div>

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
