
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
    <div className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div key={item.id} className="border-b border-gray-200 last:border-b-0">
          <div 
            className="py-4 px-2 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => onSelectAudio(item.id)}
          >
            <div className="flex-1">
              <h3 className="font-medium">{item.title}</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{formatTime(item.duration)}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-attune-blue"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AudioGrid;

// Import the formatter function
import { formatTime } from '@/utils/formatters';
