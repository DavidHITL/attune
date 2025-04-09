
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import RealtimeChat from '@/components/RealtimeChat';
import { Toaster } from '@/components/ui/toaster';
import { Card } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center justify-between py-12 px-4">
      <Toaster />
      
      <div className="flex-1 flex flex-col items-center w-full max-w-4xl">
        <AttuneLogo />
        
        <Card className="w-full mt-10 h-[500px] max-h-[60vh] border-none backdrop-blur-sm bg-white/10 shadow-lg">
          <RealtimeChat />
        </Card>
      </div>
    </div>
  );
};

export default Index;
