
import React from 'react';
import RealtimeChat from '@/components/RealtimeChat';

const Voice = () => {
  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
      <div className="w-full max-w-4xl h-[500px] max-h-[60vh]">
        <RealtimeChat />
      </div>
    </div>
  );
};

export default Voice;
