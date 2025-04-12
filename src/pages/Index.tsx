import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import AttuneContent from '@/components/AttuneContent';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import AudioPlayer from '@/components/audio/AudioPlayer';

const Index = () => {
  const {
    setBackgroundColor
  } = useBackground();
  const {
    user
  } = useAuth();
  const {
    loading,
    featuredContent,
    audioContent,
    updateProgress
  } = useAudioLibrary();
  const [playingAudio, setPlayingAudio] = useState<any>(null);

  useEffect(() => {
    // Always use cream background for this page
    setBackgroundColor(BACKGROUND_COLORS.CREAM);
  }, [setBackgroundColor]);

  const handlePlayAudio = (audioItem: any) => {
    setPlayingAudio(audioItem);
    toast({
      title: 'Now playing',
      description: audioItem.title
    });
  };

  const handleProgressUpdate = (seconds: number) => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, seconds);
  };

  const handleComplete = () => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, playingAudio.duration, true);
    toast({
      title: 'Completed',
      description: `You've completed ${playingAudio.title}`
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 pb-24 text-black font-sans bg-[#EEE0CB]">
      <Toaster />
      {/* Mobile container with fixed max-width */}
      <div className="w-full max-w-[390px] mx-auto">
        {user ? !loading ? (
          <>
            {/* Featured Content - Introductory Course */}
            {featuredContent && (
              <FeaturedAudio 
                id={featuredContent.id} 
                title={featuredContent.title} 
                description={featuredContent.description}
                duration={featuredContent.duration}
                imageUrl={featuredContent.cover_image_url}
                onPlay={() => handlePlayAudio(featuredContent)} 
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
                onSelectAudio={(id) => {
                  const audio = audioContent.find(item => item.id === id);
                  if (audio) handlePlayAudio(audio);
                }} 
              />
            </div>
            
            {/* Audio Player */}
            {playingAudio && (
              <AudioPlayer 
                title={playingAudio.title}
                description={playingAudio.description}
                audioUrl={playingAudio.audio_url} 
                coverImage={playingAudio.cover_image_url} 
                initialProgress={playingAudio.progress?.progress_seconds || 0} 
                onClose={() => setPlayingAudio(null)} 
                onProgressUpdate={handleProgressUpdate} 
                onComplete={handleComplete}
              />
            )}
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-black">Loading audio library...</p>
          </div>
        ) : (
          <AttuneContent />
        )}
      </div>
    </div>
  );
};

export default Index;
