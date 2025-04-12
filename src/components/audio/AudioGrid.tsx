
import React from 'react';
import { formatTime } from '@/utils/formatters';
import { Play } from 'lucide-react';

interface AudioItem {
  id: string;
  title: string;
  duration: number;
  cover_image_url?: string | null;
  progress?: number | null;
  description?: string | null;
}

interface AudioGridProps {
  items: AudioItem[];
  onSelectAudio: (id: string) => void;
}

const AudioGrid: React.FC<AudioGridProps> = ({ items, onSelectAudio }) => {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-black font-sans">
        No audio content available
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div key={item.id} className="border-b border-gray-200 last:border-b-0">
          <div 
            className="py-4 px-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => onSelectAudio(item.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              {item.cover_image_url ? (
                <div className="w-12 h-12 rounded overflow-hidden">
                  <img 
                    src={item.cover_image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center">
                  <span className="text-xl">🎧</span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="font-sans font-medium text-black">{item.title}</h3>
                
                {item.progress !== undefined && item.progress > 0 && (
                  <div className="mt-1 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-black rounded-full"
                      style={{ width: `${Math.min(100, (item.progress / item.duration) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-sans text-black">{formatTime(item.duration)}</span>
              <Play className="h-5 w-5 text-black" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AudioGrid;
