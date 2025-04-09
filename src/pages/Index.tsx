
import React, { useState, useEffect } from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import AudioWaveform from '@/components/AudioWaveform';
import CallControls from '@/components/CallControls';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);
  const [callTime, setCallTime] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (isCallActive) {
      timer = setInterval(() => {
        setCallTime((prevTime) => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCallActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setTimeout(() => {
      setIsCallActive(true);
      setCallTime(0);
      setIsMicOn(true);
      setIsMuted(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center justify-between py-12 px-4">
      <Toaster />
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <AttuneLogo />
        {isCallActive && (
          <div className="mt-8 text-attune-purple font-medium">
            Call time: {formatTime(callTime)}
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        <AudioWaveform isActive={isCallActive && isMicOn && !isMuted} />
      </div>

      <div className="mt-12 mb-8 w-full max-w-md">
        <CallControls
          isMicOn={isMicOn}
          isMuted={isMuted}
          onToggleMic={handleToggleMic}
          onToggleMute={handleToggleMute}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
};

export default Index;
