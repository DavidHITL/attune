
import React from 'react';
import { Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface CallControlsProps {
  isMicOn: boolean;
  isMuted: boolean;
  onToggleMic: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isMicOn,
  isMuted,
  onToggleMic,
  onToggleMute,
  onEndCall,
}) => {
  const handleToggleMic = () => {
    onToggleMic();
    toast({
      title: isMicOn ? "Microphone turned off" : "Microphone turned on",
      duration: 2000,
    });
  };

  const handleToggleMute = () => {
    onToggleMute();
    toast({
      title: isMuted ? "Audio unmuted" : "Audio muted",
      duration: 2000,
    });
  };

  const handleEndCall = () => {
    onEndCall();
    toast({
      title: "Call ended",
      duration: 2000,
    });
  };

  return (
    <div className="flex justify-center gap-10">
      <Button
        onClick={handleToggleMic}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full bg-attune-blue/30 border-none hover:bg-attune-blue/50"
      >
        {isMicOn ? (
          <Mic className="h-8 w-8 text-attune-purple" />
        ) : (
          <MicOff className="h-8 w-8 text-attune-purple" />
        )}
      </Button>

      <Button
        onClick={handleToggleMute}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full bg-attune-blue/30 border-none hover:bg-attune-blue/50"
      >
        <div className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-attune-purple"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          </svg>
          {isMuted && (
            <X 
              className="h-5 w-5 text-attune-red absolute right-0 bottom-0" 
              strokeWidth={3}
            />
          )}
        </div>
      </Button>

      <Button
        onClick={handleEndCall}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full bg-attune-blue/30 border-none hover:bg-attune-blue/50"
      >
        <X className="h-8 w-8 text-attune-purple" />
      </Button>
    </div>
  );
};

export default CallControls;
