
import { useState, useCallback } from 'react';
import { useConversationId } from '@/hooks/useConversationId';

/**
 * Hook for managing session state
 */
export const useSessionManagement = () => {
  const { conversationId, setConversationId } = useConversationId();
  const [hasReceivedSessionCreated, setHasReceivedSessionCreated] = useState(false);
  
  // We're removing the session.create function as it's not supported by OpenAI's API
  // The WebRTC connection already establishes the session during SDP exchange
  
  // Function to send session update event
  const sendSessionUpdate = useCallback((websocket: WebSocket) => {
    if (websocket.readyState === WebSocket.OPEN) {
      console.log('[SessionManagement] Sending session.update with input_audio_transcription configuration');
      websocket.send(JSON.stringify({
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
  }, []);
  
  // Handle session created event
  const handleSessionCreated = useCallback(() => {
    console.log('[SessionManagement] Session created event detected');
    setHasReceivedSessionCreated(true);
  }, []);
  
  // Reset session state
  const resetSession = useCallback(() => {
    setHasReceivedSessionCreated(false);
    setConversationId(null);
  }, [setConversationId]);

  return {
    conversationId,
    setConversationId,
    hasReceivedSessionCreated,
    setHasReceivedSessionCreated,
    sendSessionUpdate,
    handleSessionCreated,
    resetSession
  };
};
