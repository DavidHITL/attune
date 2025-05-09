
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeChat } from '@/utils/chat/RealtimeChat';
import { useConnectionManager } from './useConnectionManager';
import { useMessageEventHandler } from './useMessageEventHandler';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { useConversation } from '../useConversation';
import { VoicePlayer } from '@/utils/audio/VoicePlayer';
import { toast } from 'sonner';

export const useChatClient = () => {
  const { saveMessage } = useConversation();
  const chatClientRef = useRef<RealtimeChat | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY_COUNT = 2;
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use our custom message handler from useMessageEventHandler
  const {
    status,
    setStatus,
    combinedMessageHandler
  } = useMessageEventHandler();

  // Use our connection manager hook
  const {
    startConversation,
    endConversation
  } = useConnectionManager(
    chatClientRef, 
    combinedMessageHandler,
    setStatus, 
    saveMessage,
    setIsConnected,
    setIsMicOn,
    setVoiceActivityState,
    setConnectionError
  );

  // ENHANCED: Wake up audio system proactively before connection
  const preloadAudioSystem = useCallback(() => {
    console.log("[useChatClient] Preloading audio system");
    
    // Wake up audio system early, especially important for mobile devices
    VoicePlayer.wakeUpAudioSystem();
    
    // Preload test tone for better responsiveness
    setTimeout(() => {
      console.log("[useChatClient] Playing preload test tone");
      try {
        VoicePlayer.testAudioOutput();
      } catch (err) {
        console.warn("[useChatClient] Could not play preload test tone:", err);
      }
    }, 100);
  }, []);
  
  // Enhanced start conversation function with better error handling and audio preparation
  const handleStartConversation = useCallback(async () => {
    if (connectionInProgress) {
      console.log("[useChatClient] Connection already in progress, ignoring duplicate request");
      return;
    }
    
    setConnectionInProgress(true);
    setConnectionError(null);
    
    try {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // PERFORMANCE: Preload audio system before starting conversation
      preloadAudioSystem();
      
      // Add small delay to ensure audio system is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start the conversation
      console.log("[useChatClient] Starting conversation");
      await startConversation();
      
      // Reset retry count on success
      setRetryCount(0);
      
      // PERFORMANCE: Play a test tone after successful connection
      console.log("[useChatClient] Playing audio test tone after connection");
      setTimeout(() => {
        try {
          VoicePlayer.testAudioOutput();
        } catch (err) {
          console.warn("[useChatClient] Could not play test tone:", err);
        }
      }, 100);
      
      // PERFORMANCE: Check connection health after a brief delay
      setTimeout(() => {
        if (chatClientRef.current && 
            typeof chatClientRef.current.getWebRTCConnection === 'function') {
          
          const webRTCConnection = chatClientRef.current.getWebRTCConnection();
          
          if (typeof webRTCConnection.hasSessionConfigBeenSent === 'function') {
            const sessionConfigSent = webRTCConnection.hasSessionConfigBeenSent();
            console.log("[useChatClient] Session config sent status:", sessionConfigSent);
            
            // If session config wasn't sent, try to force send it
            if (!sessionConfigSent) {
              console.log("[useChatClient] Session config not sent, forcing send");
              webRTCConnection.forceSendSessionConfig();
            }
          }
          
          // Check connection health
          if (typeof webRTCConnection.isConnectionHealthy === 'function') {
            const isHealthy = webRTCConnection.isConnectionHealthy();
            console.log("[useChatClient] Connection health check:", isHealthy);
            
            if (!isHealthy && chatClientRef.current) {
              console.log("[useChatClient] Connection doesn't appear healthy, sending ping");
              try {
                webRTCConnection.sendMessage({
                  type: "client.ping",
                  timestamp: Date.now()
                });
              } catch (err) {
                console.error("[useChatClient] Error sending test message:", err);
              }
            }
          }
        }
      }, 2000); // Reduced delay for faster health check
      
    } catch (error) {
      console.error("[useChatClient] Failed to start conversation:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to start conversation");
      
      // Implement retry logic
      if (retryCount < MAX_RETRY_COUNT) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        
        const retryDelay = 1000 * Math.pow(1.5, retryCount); // Faster exponential backoff
        
        console.log(`[useChatClient] Scheduling retry #${nextRetry} in ${retryDelay}ms`);
        toast.info(`Connection failed, retrying... (${nextRetry}/${MAX_RETRY_COUNT})`);
        
        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`[useChatClient] Executing retry #${nextRetry}`);
          handleStartConversation();
        }, retryDelay);
      } else {
        // Max retries reached, show error
        toast.error("Connection failed after multiple attempts", {
          description: "Please try again later."
        });
        
        // Ensure cleanup on error
        if (chatClientRef.current) {
          endConversation();
        }
      }
    } finally {
      setConnectionInProgress(false);
    }
  }, [startConversation, endConversation, connectionInProgress, retryCount, MAX_RETRY_COUNT, preloadAudioSystem]);

  // Toggle mute status
  const toggleMute = useCallback(() => {
    if (chatClientRef.current) {
      const newMuteState = !isMuted;
      chatClientRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
      
      if (newMuteState) {
        toast.info("Microphone muted");
      } else {
        toast.info("Microphone unmuted");
      }
    }
  }, [isMuted]);

  // PERFORMANCE: Preload audio system on component mount
  useEffect(() => {
    preloadAudioSystem();
  }, [preloadAudioSystem]);

  // Ensure proper cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (chatClientRef.current) {
        console.log("[useChatClient] Cleaning up on unmount");
        endConversation();
      }
    };
  }, [endConversation]);

  return {
    status,
    isConnected,
    isMicOn,
    isMuted,
    voiceActivityState,
    connectionError,
    startConversation: handleStartConversation,
    endConversation,
    toggleMute,
    connectionInProgress,
    retryCount
  };
};
