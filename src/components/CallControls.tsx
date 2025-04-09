
import React from 'react';
import { Mic, MicOff, Volume, VolumeX, X } from 'lucide-react';
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
        className="w-20 h-20 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        {isMicOn ? (
          <Mic className="h-10 w-10 text-attune-purple" strokeWidth={2.5} />
        ) : (
          <MicOff className="h-10 w-10 text-attune-purple" strokeWidth={2.5} />
        )}
      </Button>

      <Button
        onClick={handleToggleMute}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        {isMuted ? (
          <VolumeX className="h-10 w-10 text-attune-purple" strokeWidth={2.5} />
        ) : (
          <Volume className="h-10 w-10 text-attune-purple" strokeWidth={2.5} />
        )}
      </Button>

      <Button
        onClick={handleEndCall}
        variant="outline"
        size="icon"
        className="w-20 h-20 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        <X className="h-10 w-10 text-attune-purple" strokeWidth={2.5} />
      </Button>
    </div>
  );
};

export default CallControls;
