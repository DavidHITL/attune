
import React from 'react';
import VoiceAssistantDisplay from './VoiceAssistantDisplay';
import { BackgroundCircles } from '@/components/ui/background-circles';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import AttuneLogo from '@/components/AttuneLogo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface VoiceCallUIProps {
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
  isMuted: boolean;
  conversationLoading: boolean;
  onToggleMute: () => void;
  onEndConversation: () => void;
  onStartConversation: () => void;
  currentVoice?: string;
  connectionError?: string | null;
  isStartDisabled?: boolean;
}

const VoiceCallUI: React.FC<VoiceCallUIProps> = ({
  isConnected,
  voiceActivityState,
  isMuted,
  conversationLoading,
  onToggleMute,
  onEndConversation,
  onStartConversation,
  currentVoice = 'default',
  connectionError,
  isStartDisabled = false
}) => {
  // Show a loading skeleton while conversation data is loading
  if (conversationLoading) {
    return (
      <div className="h-full flex flex-col items-center bg-[#1B4965]">
        <AttuneLogo />
        <div className="flex-1 w-full flex flex-col items-center justify-center mt-8 space-y-4">
          <Skeleton className="h-8 w-3/4 bg-white/10" />
          <Skeleton className="h-24 w-4/5 bg-white/10" />
          <div className="mt-auto mb-16 flex justify-center space-x-6">
            <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
            <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Background animation - only show when connected */}
      {isConnected && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
          <BackgroundCircles 
            title=""
            description=""
            variant="septenary"
            className="absolute inset-0"
          />
        </div>
      )}
      
      {/* Error alert if there's a connection error */}
      {connectionError && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {connectionError}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Voice assistant display */}
      <div className="relative z-10 h-full">
        <VoiceAssistantDisplay
          status=""
          isConnected={isConnected}
          voiceActivityState={voiceActivityState}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onEndConversation={onEndConversation}
          onStartConversation={onStartConversation}
          currentVoice={currentVoice}
          connectionError={connectionError}
          isStartDisabled={isStartDisabled}
        />
      </div>
    </div>
  );
};

export default VoiceCallUI;
