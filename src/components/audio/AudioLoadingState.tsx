
import React from 'react';

interface AudioLoadingStateProps {
  isLoading: boolean;
  isAudioValidating: boolean;
}

const AudioLoadingState: React.FC<AudioLoadingStateProps> = ({ 
  isLoading,
  isAudioValidating
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-black">Loading audio library...</p>
      </div>
    );
  }

  if (isAudioValidating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-xl"></div>
        <div className="relative z-10 bg-white p-6 rounded-lg shadow-xl text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading audio...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AudioLoadingState;
