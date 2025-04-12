
import React from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
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
        className="w-24 h-24 rounded-full bg-slate-300/80 border-none shadow-lg hover:bg-slate-300/90 transition-all call-control-hover"
      >
        {isMicOn ? (
          <Mic className="h-6 w-6 text-black" strokeWidth={1.5} />
        ) : (
          <MicOff className="h-6 w-6 text-black" strokeWidth={1.5} />
        )}
      </Button>

      <Button
        onClick={handleToggleMute}
        variant="outline"
        size="icon"
        className="w-24 h-24 rounded-full bg-slate-300/80 border-none shadow-lg hover:bg-slate-300/90 transition-all call-control-hover"
      >
        {isMuted ? (
          <VolumeX className="h-6 w-6 text-black" strokeWidth={1.5} />
        ) : (
          <Volume2 className="h-6 w-6 text-black" strokeWidth={1.5} />
        )}
      </Button>

      <Button
        onClick={handleEndCall}
        variant="outline"
        size="icon"
        className="w-24 h-24 rounded-full bg-slate-300/80 border-none shadow-lg hover:bg-slate-300/90 transition-all call-control-hover"
      >
        <PhoneOff className="h-6 w-6 text-black" strokeWidth={1.5} />
      </Button>
    </div>
  );
};

export default CallControls;
