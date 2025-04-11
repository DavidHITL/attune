
import React from 'react';
import { Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatTime } from '@/utils/formatters';

interface FeaturedAudioProps {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  imageUrl?: string | null;
  progress?: number | null;
  onPlay: () => void;
}

const FeaturedAudio: React.FC<FeaturedAudioProps> = ({
  title,
  description,
  duration,
  imageUrl,
  progress,
  onPlay
}) => {
  const progressPercentage = progress ? Math.min(100, (progress / duration) * 100) : 0;
  
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-attune-blue to-attune-purple mb-8">
      <div className="flex flex-col md:flex-row p-6">
        <div className="md:w-1/3">
          <div className="aspect-square rounded-lg overflow-hidden bg-white/20 shadow-lg">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-attune-blue/40">
                <span className="text-6xl opacity-30">🎧</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="md:w-2/3 md:pl-6 mt-4 md:mt-0 text-white">
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="mt-2 opacity-90 line-clamp-3">{description}</p>
          )}
          
          <div className="mt-4">
            <div className="flex justify-between items-center text-sm mb-1">
              <span>{formatTime(duration)}</span>
              {progressPercentage > 0 && <span>{Math.round(progressPercentage)}% complete</span>}
            </div>
            
            {progressPercentage > 0 && (
              <div className="relative h-1 bg-white/30 rounded-full overflow-hidden mb-4">
                <div 
                  className="absolute top-0 left-0 h-full bg-white rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
            
            <Button 
              onClick={onPlay}
              className="bg-white text-attune-purple hover:bg-white/90"
            >
              <Play className="mr-2 h-4 w-4" />
              {progressPercentage > 0 ? 'Continue' : 'Play'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedAudio;
