
import React from 'react';
import AudioCard from './AudioCard';

interface AudioItem {
  id: string;
  title: string;
  duration: number;
  cover_image_url?: string | null;
  progress?: number | null;
}

interface AudioGridProps {
  items: AudioItem[];
  onSelectAudio: (id: string) => void;
}

const AudioGrid: React.FC<AudioGridProps> = ({ items, onSelectAudio }) => {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No audio content available
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <AudioCard
          key={item.id}
          id={item.id}
          title={item.title}
          duration={item.duration}
          imageUrl={item.cover_image_url}
          progress={item.progress}
          onClick={() => onSelectAudio(item.id)}
        />
      ))}
    </div>
  );
};

export default AudioGrid;
