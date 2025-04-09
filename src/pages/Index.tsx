
import React, { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import AttuneContent from '@/components/AttuneContent';
import { useBackground } from '@/context/BackgroundContext';

const Index = () => {
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor('bg-attune-blue');
  }, [setBackgroundColor]);

  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center justify-center py-12 px-4">
      <Toaster />
      <div className="w-full max-w-[390px]">
        <AttuneContent />
      </div>
    </div>
  );
};

export default Index;
