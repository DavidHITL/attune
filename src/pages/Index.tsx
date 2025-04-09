
import React from 'react';
import RealtimeChat from '@/components/RealtimeChat';
import { Toaster } from '@/components/ui/toaster';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/Navigation';

const Index = () => {
  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center justify-between py-4 px-4">
      <Toaster />
      
      <div className="w-full max-w-4xl">
        <Navigation />
      </div>
      
      <div className="flex-1 flex flex-col items-center w-full max-w-4xl relative">
        <Card className="w-full mt-10 h-[500px] max-h-[60vh] border-none backdrop-blur-sm bg-white/10 shadow-lg">
          <RealtimeChat />
        </Card>
      </div>
    </div>
  );
};

export default Index;
