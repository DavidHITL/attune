
import React, { useEffect, useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useChatClient } from '@/hooks/voice/useChatClient';
import { useCallControls } from '@/hooks/voice/useCallControls';
import VoiceCallUI from './voice/VoiceCallUI';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RealtimeChatProps {
  isDisabled?: boolean;
}

const RealtimeChat: React.FC<RealtimeChatProps> = ({ isDisabled = false }) => {
  const [currentVoice, setCurrentVoice] = useState<string>('');
  const { user } = useAuth();
  
  const { loading: conversationLoading } = useConversation();
  
  const {
    status,
    isConnected,
    voiceActivityState,
    isMuted,
    connectionError,
    startConversation,
    endConversation,
    toggleMute
  } = useChatClient();

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
    <>
      {!user && (
        <div className="mb-4">
          <Alert variant="default" className="bg-amber-500/10 border-amber-500/50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500">Anonymous Mode</AlertTitle>
            <AlertDescription className="text-amber-400">
              You're not signed in. Your conversation won't be saved.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <VoiceCallUI
        isConnected={isConnected}
        voiceActivityState={voiceActivityState}
        isMuted={isMuted}
        connectionError={connectionError}
        conversationLoading={conversationLoading}
        onToggleMute={toggleMute}
        onEndConversation={handleEndCall}
        onStartConversation={isDisabled ? undefined : handleStartCall}
        currentVoice={currentVoice}
        isStartDisabled={isDisabled}
      />
    </>
  );
};

export default RealtimeChat;
