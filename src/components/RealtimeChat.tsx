
import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/RealtimeAudio';
import CallControls from '@/components/CallControls';
import VoiceActivityIndicator, { VoiceActivityState } from './VoiceActivityIndicator';
import { useConversation, Message } from '@/hooks/useConversation';
import { useAuth } from '@/context/AuthContext';

const RealtimeChat: React.FC = () => {
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const { user } = useAuth();
  const { messages, saveMessage, conversationId, loading: conversationLoading } = useConversation();

  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      if (chatClientRef.current) {
        console.log("Component unmounting - disconnecting chat client");
        chatClientRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Update conversation context indicator when messages change
    setHasContext(messages.length > 0);
    setMessageCount(messages.length);
  }, [messages]);

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
    if (!user) {
      console.log("User not authenticated, skipping message save");
      return;
    }
    
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

  const renderMessages = () => {
    if (messages.length === 0) return null;
    
    // Show messages in a scrollable container
    return (
      <div className="mb-8 mt-4 max-h-60 overflow-y-auto border border-attune-blue/30 rounded-lg p-4 bg-attune-blue/10">
        <h3 className="text-sm font-medium mb-2 text-attune-purple">
          Recent Conversation History
          {messages.length > 10 && ` (showing all ${messages.length} messages)`}
        </h3>
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <span className="text-xs text-attune-purple/70 block mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-attune-purple/20 text-attune-purple' 
                : 'bg-attune-blue/30 text-attune-purple'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status indicator */}
      <div className="text-center text-attune-purple mb-4 mt-4">
        <div className="text-xl font-semibold mb-2">
          {isConnected ? "Voice Assistant Active" : "Voice Assistant"}
        </div>
        <div className="text-sm flex flex-col items-center justify-center gap-2">
          <div>Status: {status}</div>
          
          {/* Voice activity indicator - always visible */}
          {isConnected && (
            <div className="flex items-center gap-2 justify-center mt-2">
              <VoiceActivityIndicator state={voiceActivityState} />
            </div>
          )}
        </div>
      </div>

      {/* Conversation history indicator */}
      {!user && !conversationLoading && (
        <div className="text-center mb-4 p-2 bg-yellow-50 rounded-md text-yellow-700 text-sm">
          <p>Sign in to enable conversation memory between sessions</p>
        </div>
      )}
      
      {user && hasContext && !isConnected && !conversationLoading && (
        <div className="text-center mb-4 p-2 bg-green-50 rounded-md text-green-700 text-sm">
          <p>The assistant will remember your previous {messageCount} message conversation</p>
        </div>
      )}

      {/* Conversation history (if any) */}
      {!conversationLoading && renderMessages()}
      
      {/* Voice interaction instructions */}
      {!isConnected && (
        <div className="text-center mb-6 text-attune-purple/80">
          <p>Press the microphone button below to start a voice conversation with the AI assistant.</p>
          {messages.length > 0 && user && (
            <p className="mt-2 text-sm">
              The assistant will remember your previous conversation.
            </p>
          )}
        </div>
      )}
      
      {isConnected && (
        <div className="text-center mb-6 text-attune-purple/80">
          <p>Speak naturally to interact with the AI. The assistant will listen and respond with voice.</p>
        </div>
      )}

      {/* Call controls */}
      <div className="flex justify-center mt-auto mb-6">
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
