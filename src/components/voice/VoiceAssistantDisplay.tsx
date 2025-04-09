import React from 'react';
import { Message } from '@/utils/types';
import { VoiceActivityState } from '../VoiceActivityIndicator';
import CallControls from '@/components/CallControls';
import AttuneLogo from '@/components/AttuneLogo';
interface VoiceAssistantDisplayProps {
  user: any;
  status: string;
  isConnected: boolean;
  voiceActivityState: VoiceActivityState;
  messages: Message[];
  messageCount: number;
  hasContext: boolean;
  isMicOn: boolean;
  isMuted: boolean;
  conversationLoading: boolean;
  onToggleMicrophone: () => void;
  onToggleMute: () => void;
  onEndConversation: () => void;
  onStartConversation: () => void;
}
const VoiceAssistantDisplay: React.FC<VoiceAssistantDisplayProps> = ({
  user,
  isConnected,
  voiceActivityState,
  isMicOn,
  isMuted,
  conversationLoading,
  onToggleMicrophone,
  onToggleMute,
  onEndConversation,
  onStartConversation
}) => {
  return <div className="flex flex-col h-full">
      {/* Logo and Header */}
      <div className="mb-6 flex justify-center">
        <AttuneLogo />
      </div>
      
      {/* Voice interaction instructions */}
      {!isConnected && <div className="text-center my-6 text-attune-purple/80">
          <p>Feel like talking?
Attune remembers past conversations, so you can always pick up where you left off — or not.</p>
        </div>}
      
      {isConnected && <div className="text-center my-6 text-attune-purple/80">
          <p>Speak naturally to interact with the AI. The assistant will listen and respond with voice.</p>
        </div>}

      {/* Call controls */}
      <div className="flex justify-center mt-auto mb-6">
        {!isConnected ? <div onClick={onStartConversation} className="w-20 h-20 rounded-full bg-attune-blue/20 border-none shadow-lg hover:bg-attune-blue/30 transition-all cursor-pointer flex items-center justify-center">
            <div className="h-10 w-10 text-attune-purple">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
          </div> : <CallControls isMicOn={isMicOn} isMuted={isMuted} onToggleMic={onToggleMicrophone} onToggleMute={onToggleMute} onEndCall={onEndConversation} />}
      </div>
    </div>;
};
export default VoiceAssistantDisplay;