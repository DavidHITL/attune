
import React, { useEffect, useState, useRef } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { useChatClient } from '@/hooks/voice/useChatClient';
import { useCallControls } from '@/hooks/voice/useCallControls';
import VoiceCallUI from './voice/VoiceCallUI';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTranscriptAggregator } from '@/hooks/voice/useTranscriptAggregator';

interface RealtimeChatProps {
  isDisabled?: boolean;
  onTranscriptAggregatorReady?: (api: any) => void;
}

const RealtimeChat: React.FC<RealtimeChatProps> = ({ 
  isDisabled = false, 
  onTranscriptAggregatorReady 
}) => {
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
  
  // Get transcript aggregator for saving transcripts
  const transcriptAggregator = useTranscriptAggregator();
  
  // Expose transcript API to parent component
  useEffect(() => {
    if (onTranscriptAggregatorReady) {
      console.log('[RealtimeChat] Providing transcript aggregator API to parent');
      onTranscriptAggregatorReady(transcriptAggregator);
    }
  }, [onTranscriptAggregatorReady, transcriptAggregator]);
  
  // Get voice setting
  useEffect(() => {
    const fetchVoiceSetting = async () => {
      try {
        console.log('[RealtimeChat] Fetching voice setting from database');
        const { data, error } = await supabase
          .from('bot_config')
          .select('voice')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          console.error('[RealtimeChat] Error fetching voice setting:', error);
          throw error;
        }
        
        if (data && data.voice) {
          console.log("[RealtimeChat] Current voice setting:", data.voice);
          setCurrentVoice(data.voice);
        }
      } catch (error) {
        console.error("[RealtimeChat] Error fetching voice setting:", error);
      }
    };
    
    fetchVoiceSetting();
  }, []);

  // Custom end call handler that saves transcript before ending call
  const handleEndCallWithTranscriptSave = async () => {
    console.log('[RealtimeChat] Ending call with transcript save');
    // First save any pending transcript
    if (transcriptAggregator.currentTranscript) {
      console.log('[RealtimeChat] Saving pending transcript before ending call');
      // CRITICAL: Always explicitly set role to 'user'
      await transcriptAggregator.saveCurrentTranscript('user');
    }
    // Then end the call
    handleEndCall();
  };
  
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
        onEndConversation={handleEndCallWithTranscriptSave}
        onStartConversation={isDisabled ? undefined : handleStartCall}
        currentVoice={currentVoice}
        isStartDisabled={isDisabled}
      />
    </>
  );
};

export default RealtimeChat;
