
import React from 'react';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import { AudioItem } from '@/hooks/useAudioPlayback';

interface AudioContentSectionProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  featuredContent: AudioItem | null;
  audioContent: AudioItem[];
  onSelectAudio: (id: string) => void;
}

const AudioContentSection: React.FC<AudioContentSectionProps> = ({ 
  isLoggedIn,
  isLoading,
  featuredContent,
  audioContent,
  onSelectAudio
}) => {
  if (!isLoggedIn || isLoading) return null;

  return (
    <>
      {/* Featured Content - Introductory Course */}
      {featuredContent && (
        <FeaturedAudio 
          id={featuredContent.id} 
          title={featuredContent.title} 
          description={featuredContent.description}
          duration={featuredContent.duration}
          imageUrl={featuredContent.cover_image_url}
          onPlay={() => onSelectAudio(featuredContent.id)} 
        />
      )}
      
      {/* Audio List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg mt-8">
        <h2 className="text-xl font-bold p-4">All Audio Content</h2>
        <AudioGrid 
          items={audioContent.map(audio => ({
            ...audio,
            progress: audio.progress?.progress_seconds
          }))} 
          onSelectAudio={onSelectAudio} 
        />
      </div>
    </>
  );
};

export default AudioContentSection;
