
import React from 'react';
import AudioCover from './AudioCover';

interface PlayerHeaderProps {
  title: string;
  description?: string | null;
  coverImage?: string | null;
  isCached?: boolean;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ 
  title, 
  description, 
  coverImage,
  isCached 
}) => {
  return (
    <>
      <AudioCover coverImage={coverImage} title={title} />
      <div className="mb-6 text-center">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        {description && (
          <div className="text-sm text-gray-700 max-h-24 overflow-y-auto mb-2">
            {description}
          </div>
        )}
        {isCached && (
          <div className="text-xs text-green-600 mt-1">
            Using cached audio file
          </div>
        )}
      </div>
    </>
  );
};

export default PlayerHeader;
