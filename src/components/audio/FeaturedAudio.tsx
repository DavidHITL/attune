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
  return <div className="w-full rounded-xl overflow-hidden bg-gray-100 mb-8">
      <div className="p-4">
        <div className="flex flex-col items-start gap-4 mb-6">
          {/* Cover image */}
          {imageUrl && <div className="w-full rounded-lg overflow-hidden">
              <AspectRatio ratio={1.5 / 1} className="bg-muted">
                <img src={imageUrl} alt={title} className="object-cover w-full h-full" />
              </AspectRatio>
            </div>}
          
          <div className="w-full">
            <div className="text-sm text-black mb-1">
              Day {day} of {totalDays}
            </div>
            
            <h2 className="text-2xl font-bold uppercase tracking-tight text-black">
              {title}
            </h2>
            
            {description && <p className="mt-2 text-black/70">
                {description}
              </p>}
          </div>
        </div>
        
        <div onClick={onPlay} className="align-right border-t border-gray-300 py-3 cursor-pointer">
          <div className="flex justify-between items-center">
            
            <div className="flex items-center">
              <span className="mr-2 text-black">{formatTime(duration)}</span>
              <Play className="h-5 w-5 fill-current text-black" />
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default FeaturedAudio;