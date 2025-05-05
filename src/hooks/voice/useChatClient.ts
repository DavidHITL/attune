
import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useMessageEventHandler } from './useMessageEventHandler';
import { useConversationId } from '@/hooks/useConversationId';

// Define the WebSocket URL
const WS_URL = process.env.NEXT_PUBLIC_ATTUNE_WEBSOCKET_URL || 'ws://localhost:8080';

// Custom hook for managing the chat client and its connection
export const useChatClient = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const { conversationId, setConversationId } = useConversationId();
  const [hasReceivedSessionCreated, setHasReceivedSessionCreated] = useState(false);
  
  // Ref to hold the WebSocket instance
  const chatClientRef = useRef<WebSocket | null>(null);
  
  // Use our custom hook for handling message events
  const { 
    voiceActivityState,
    combinedMessageHandler
  } = useMessageEventHandler(chatClientRef);
  
  // Enhanced message handler to detect session.created events
  const enhancedMessageHandler = useCallback((event: any) => {
    // Process the event with the standard handler first
    combinedMessageHandler(event);
    
    // Check for session.created to send the session.update with audio transcription configuration
    if (event.type === 'session.created') {
      console.log('[ChatClient] Session created event detected, will send session.update');
      setHasReceivedSessionCreated(true);
      
      // Send the session.update event
      if (chatClientRef.current?.readyState === WebSocket.OPEN) {
        console.log('[ChatClient] Sending session.update with input_audio_transcription configuration');
        chatClientRef.current.send(JSON.stringify({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "whisper-1" },
            // Include other required session settings
            modalities: ["text", "audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad", // Let the server detect turns
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            }
          }
        }));
      }
    }
  }, [combinedMessageHandler]);
  
  // Function to start the WebSocket connection
  const startConversation = useCallback(async () => {
    if (chatClientRef.current || isConnected) {
      console.log("Already connected or connecting");
      return;
    }
    
    // Shorthand to check if we have a valid convo ID
    const hasValidConversationId = () => conversationId && conversationId !== 'new';
    
    // Optimistic UI update
    setIsConnected(false);
    setStatus('connecting');
    setConnectionError(null);
    setHasReceivedSessionCreated(false);
    
    try {
      // Generate a unique session ID
      const sessionId = uuidv4();
      
      // Create a new WebSocket connection
      chatClientRef.current = new WebSocket(`${WS_URL}?session_id=${sessionId}`);
      
      // Set up WebSocket event listeners
      chatClientRef.current.onopen = async () => {
        console.log('WebSocket connection opened');
        setIsConnected(true);
        setStatus('connected');
        setConnectionError(null);
        
        // Send session.create event after connection is open
        chatClientRef.current?.send(JSON.stringify({
          type: "session.create",
          session_id: sessionId,
          configuration: {
            modalities: ["text", "audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad", // Let the server detect turns
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            }
          }
        }));
      };
      
      chatClientRef.current.onmessage = (event) => {
        // Process incoming messages using the enhanced handler
        enhancedMessageHandler(JSON.parse(event.data));
      };
      
      chatClientRef.current.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        setIsConnected(false);
        setStatus('disconnected');
        chatClientRef.current = null;
        setHasReceivedSessionCreated(false);
        
        // Clear conversation ID on disconnect
        setConversationId(null);
        
        // Show toast notification
        toast.error("Disconnected from voice server", {
          description: "Please check your internet connection and try again.",
          duration: 3000
        });
      };
      
      chatClientRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setStatus('error');
        setConnectionError('Failed to connect to the server. Please try again.');
        chatClientRef.current = null;
        
        // Show toast notification
        toast.error("Connection error", {
          description: "Please check your internet connection and try again.",
          duration: 3000
        });
      };
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsConnected(false);
      setStatus('error');
      setConnectionError('Failed to start conversation. Please try again.');
      
      // Show toast notification
      toast.error("Failed to start conversation", {
        description: "Please try again.",
        duration: 3000
      });
    }
  }, [enhancedMessageHandler, setConversationId, conversationId]);
  
  // Function to end the WebSocket connection
  const endConversation = useCallback(() => {
    if (chatClientRef.current) {
      console.log('Ending conversation and closing WebSocket connection');
      chatClientRef.current.close();
      chatClientRef.current = null;
      setIsConnected(false);
      setStatus('disconnected');
      setConnectionError(null);
      setHasReceivedSessionCreated(false);
      
      // Clear conversation ID on disconnect
      setConversationId(null);
      
      // Show toast notification
      toast.success("Call ended", {
        description: "You have disconnected from the voice server.",
        duration: 2000
      });
    } else {
      console.log('No active WebSocket connection to end');
    }
  }, [setConversationId]);
  
  // Function to toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted(prevIsMuted => !prevIsMuted);
  }, []);
  
  return {
    status,
    isConnected,
    voiceActivityState,
    isMuted,
    connectionError,
    hasReceivedSessionCreated,
    startConversation,
    endConversation,
    toggleMute,
    chatClientRef
  };
};
