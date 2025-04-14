
import React, { useEffect, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useChatClient } from './voice/useChatClient';
import { useCallControls } from '@/hooks/voice/useCallControls';
import VoiceCallUI from './voice/VoiceCallUI';
import { supabase } from '@/integrations/supabase/client';

const RealtimeChat: React.FC = () => {
  const [currentVoice, setCurrentVoice] = useState<string>('');
  // Get conversation state from the useConversation hook
  const { loading: conversationLoading } = useConversation();
  
  // Get chat client functionality
  const {
    status,
    isConnected,
    voiceActivityState,
    isMuted,
    startConversation,
    endConversation,
    toggleMute
  } = useChatClient();

  // Get call control functionality
  const { handleStartCall, handleEndCall } = useCallControls(
    startConversation, 
    endConversation
  );
  
  // Fetch the current voice setting
  useEffect(() => {
    const fetchVoiceSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('bot_config')
          .select('voice')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (error) throw error;
        
        if (data && data.voice) {
          console.log("Current voice setting:", data.voice);
          setCurrentVoice(data.voice);
        }
      } catch (error) {
        console.error("Error fetching voice setting:", error);
      }
    };
    
    fetchVoiceSetting();
  }, []);

  return (
    <VoiceCallUI
      isConnected={isConnected}
      voiceActivityState={voiceActivityState}
      isMuted={isMuted}
      conversationLoading={conversationLoading}
      onToggleMute={toggleMute}
      onEndConversation={handleEndCall}
      onStartConversation={handleStartCall}
      currentVoice={currentVoice}
    />
  );
};

export default RealtimeChat;
