
import React, { useState } from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import AudioWaveform from '@/components/AudioWaveform';
import CallControls from '@/components/CallControls';
import RealtimeChat from '@/components/RealtimeChat';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);
  const [callTime, setCallTime] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('demo');

  React.useEffect(() => {
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
      
      <div className="flex-1 flex flex-col items-center w-full max-w-4xl">
        <AttuneLogo />
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-4xl mt-8"
        >
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="demo">Demo Call</TabsTrigger>
            <TabsTrigger value="realtime">AI Voice Chat</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo" className="w-full">
            <div className="flex flex-col items-center">
              {isCallActive && (
                <div className="mt-8 text-attune-purple font-medium">
                  Call time: {formatTime(callTime)}
                </div>
              )}

              <div className="w-full max-w-md mt-12">
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
          </TabsContent>
          
          <TabsContent value="realtime" className="w-full h-[500px] max-h-[60vh]">
            <RealtimeChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
