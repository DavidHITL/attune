import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Volume, VolumeX } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { RealtimeChat as RealtimeChatClient } from '@/utils/RealtimeAudio';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const RealtimeChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState("");
  const chatClientRef = useRef<RealtimeChatClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Clean up on component unmount
    return () => {
      chatClientRef.current?.disconnect();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessageEvent = (event: any) => {
    console.log("Handling message event:", event);
    
    if (event.type === 'response.audio_transcript.delta' && event.delta) {
      // Append transcript delta to the last assistant message or create a new one
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        
        // If the last message is from the assistant, append to it
        if (lastMessage && lastMessage.role === 'assistant') {
          const updatedMessages = [...prev];
          updatedMessages[prev.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + event.delta
          };
          return updatedMessages;
        } 
        
        // Otherwise create a new message
        return [...prev, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: event.delta,
          timestamp: new Date()
        }];
      });
    } else if (event.type === 'response.audio.delta') {
      // Audio is playing
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      // Audio finished playing
      setIsSpeaking(false);
    } else if (event.type === 'session.created') {
      toast({
        title: "Connected to OpenAI",
        description: "You can now start your voice conversation",
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
        title: "Connection established",
        description: "Voice conversation started",
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to OpenAI",
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
      title: "Conversation ended",
      description: "Voice connection closed",
    });
  };

  const handleSendText = async () => {
    if (!textInput.trim() || !chatClientRef.current?.isActive()) return;
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setTextInput("");
    
    try {
      await chatClientRef.current?.sendTextMessage(textInput);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Error sending message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status indicator */}
      <div className="text-sm text-center text-attune-purple mb-2">
        Status: {status} {isSpeaking && " (Speaking...)"}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-attune-blue/10 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            {isConnected ? "Say something or type a message below" : "Connect to start a conversation"}
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`mb-4 p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-attune-purple/20 ml-auto max-w-[80%]' 
                  : 'bg-attune-blue/20 mr-auto max-w-[80%]'
              }`}
            >
              <div className="font-medium mb-1">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div>{message.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Text input area */}
      {isConnected && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Type a message..."
            className="flex-1 p-2 rounded border border-attune-blue/30 bg-attune-blue/10"
          />
          <Button onClick={handleSendText} disabled={!textInput.trim()} variant="outline" size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Call controls */}
      <div className="flex justify-center gap-8">
        {!isConnected ? (
          <Button
            onClick={startConversation}
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full bg-attune-blue/20 border-none hover:bg-attune-blue/30 transition-all"
          >
            <Mic className="h-8 w-8 text-attune-purple" strokeWidth={2} />
          </Button>
        ) : (
          <Button
            onClick={endConversation}
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full bg-attune-blue/20 border-none hover:bg-attune-blue/30 transition-all"
          >
            <MicOff className="h-8 w-8 text-attune-purple" strokeWidth={2} />
          </Button>
        )}
        
        {isConnected && (
          <Button
            disabled
            variant="outline"
            size="icon"
            className={`w-16 h-16 rounded-full ${isSpeaking ? 'bg-attune-purple/20' : 'bg-attune-blue/20'} border-none transition-all`}
          >
            {isSpeaking ? (
              <Volume className="h-8 w-8 text-attune-purple animate-pulse" strokeWidth={2} />
            ) : (
              <VolumeX className="h-8 w-8 text-attune-purple" strokeWidth={2} />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RealtimeChat;
