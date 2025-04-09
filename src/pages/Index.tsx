
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import AttuneContent from '@/components/AttuneContent';

const Index = () => {
  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center justify-between py-12 px-4 pt-20">
      <Toaster />
      <AttuneContent />
    </div>
  );
};

export default Index;
