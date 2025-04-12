
import React from 'react';
import { Play } from 'lucide-react';
import { formatTime } from '@/utils/formatters';
import { AspectRatio } from '@/components/ui/aspect-ratio';

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
  description,
  duration,
  imageUrl,
  day = 1,
  totalDays = 28,
  onPlay
}) => {
  // Default fallback image if imageUrl is null or undefined
  const fallbackImage = "/public/lovable-uploads/94d5a9ff-387c-46ed-8287-a8fa0c650c66.png";
  
  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm mb-8">
      {/* Cover image with proper aspect ratio - always try to show an image */}
      <AspectRatio ratio={16 / 9} className="bg-muted">
        <img 
          src={imageUrl || fallbackImage} 
          alt={title || "Featured Audio"} 
          className="object-cover w-full h-full"
          onError={(e) => {
            // If image fails to load, use fallback
            const target = e.target as HTMLImageElement;
            if (target.src !== fallbackImage) {
              target.src = fallbackImage;
            }
          }}
        />
      </AspectRatio>
      
      <div className="p-6">
        <div className="text-sm text-black mb-1">
          Day {day} of {totalDays}
        </div>
        
        <h2 className="text-4xl font-bold uppercase tracking-tight text-black mb-2">
          {title || "START HERE"}
        </h2>
        
        {description && (
          <p className="mt-2 text-black/70 mb-6">
            {description}
          </p>
        )}
        
        <div 
          onClick={onPlay} 
          className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4 cursor-pointer"
        >
          <span className="text-lg font-medium text-black">{formatTime(duration)}</span>
          <button className="bg-black rounded-full p-3 hover:bg-gray-800 transition-colors">
            <Play className="h-6 w-6 fill-white text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedAudio;
