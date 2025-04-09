
import React from 'react';
import { Mic, MicOff, Volume, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  };

  const handleToggleMute = () => {
    onToggleMute();
  };

  const handleEndCall = () => {
    onEndCall();
  };

  return (
    <div className="flex justify-center gap-10">
      <Button
        onClick={handleToggleMic}
        variant="outline"
        size="icon"
        className="w-24 h-24 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        {isMicOn ? (
          <Mic className="h-20 w-20 text-attune-purple" strokeWidth={1.75} />
        ) : (
          <MicOff className="h-20 w-20 text-attune-purple" strokeWidth={1.75} />
        )}
      </Button>

      <Button
        onClick={handleToggleMute}
        variant="outline"
        size="icon"
        className="w-24 h-24 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        {isMuted ? (
          <VolumeX className="h-20 w-20 text-attune-purple" strokeWidth={1.75} />
        ) : (
          <Volume className="h-20 w-20 text-attune-purple" strokeWidth={1.75} />
        )}
      </Button>

      <Button
        onClick={handleEndCall}
        variant="outline"
        size="icon"
        className="w-24 h-24 rounded-full bg-attune-blue/20 border-none backdrop-blur-md shadow-lg hover:bg-attune-blue/30 transition-all"
      >
        <X className="h-20 w-20 text-attune-purple" strokeWidth={1.75} />
      </Button>
    </div>
  );
};

export default CallControls;
