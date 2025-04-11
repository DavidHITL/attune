
import React from 'react';
import { Play } from 'lucide-react';
import { formatTime } from '@/utils/formatters';

interface FeaturedAudioProps {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  imageUrl?: string | null;
  progress?: number | null;
  day?: number;
  totalDays?: number;
  onPlay: () => void;
}

const FeaturedAudio: React.FC<FeaturedAudioProps> = ({
  title,
  duration,
  day = 1,
  totalDays = 28,
  onPlay
}) => {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-gray-100 mb-8">
      <div className="p-6">
        <div className="text-sm text-gray-600 mb-1">
          Day {day} of {totalDays}
        </div>
        
        <h2 className="text-4xl font-bold uppercase tracking-tight mb-10">
          {title}
        </h2>
        
        <div className="border-t border-b border-gray-300 py-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="font-medium">Start Here</div>
            <div className="flex items-center">
              <span className="mr-2">{formatTime(duration)}</span>
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        </div>
        
        <div 
          className="flex justify-between items-center py-4 cursor-pointer"
          onClick={onPlay}
        >
          <div className="font-medium">Meditation 1</div>
          <div className="flex items-center">
            <span className="mr-2">8m 45s</span>
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
      </div>
      
      <div className="absolute top-0 right-0 w-1/4 h-full">
        <div className="relative h-full">
          <div className="absolute bottom-0 right-0 w-full">
            <svg viewBox="0 0 200 200" className="text-attune-blue w-full">
              <path 
                d="M100,0 C155.228,0 200,44.772 200,100 C200,155.228 155.228,200 100,200 C44.772,200 0,155.228 0,100 C0,44.772 44.772,0 100,0 Z" 
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedAudio;
