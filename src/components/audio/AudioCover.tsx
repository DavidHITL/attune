
import React from 'react';

interface AudioCoverProps {
  coverImage?: string | null;
  title: string;
}

const AudioCover: React.FC<AudioCoverProps> = ({ coverImage, title }) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="h-36 w-36 rounded-lg overflow-hidden shadow-md">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-attune-blue/40">
            <span className="text-4xl opacity-30">🎧</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioCover;
