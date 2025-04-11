
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";
import { formatTime } from '@/utils/formatters';

interface AudioCardProps {
  id: string;
  title: string;
  duration: number;
  imageUrl?: string | null;
  progress?: number | null;
  onClick: () => void;
}

const AudioCard: React.FC<AudioCardProps> = ({ 
  id, 
  title, 
  duration, 
  imageUrl,
  progress,
  onClick
}) => {
  const progressPercentage = progress ? Math.min(100, (progress / duration) * 100) : 0;
  
  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="aspect-square bg-slate-200 relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-attune-blue/40 flex items-center justify-center">
            <span className="text-4xl opacity-30">🎧</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <div className="bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all">
            <Play className="h-8 w-8 text-attune-blue" />
          </div>
        </div>
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{formatTime(duration)}</span>
          
          {progressPercentage > 0 && (
            <div className="relative w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-attune-blue rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioCard;
