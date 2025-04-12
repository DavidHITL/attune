
import React, { useEffect, useState } from 'react';
import AttuneContent from '@/components/AttuneContent';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import AudioPlayer from '@/components/audio/AudioPlayer';
import AttuneLogo from '@/components/AttuneLogo';
import { toast } from 'sonner';

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
    // Use the lighter blue color for this page
    setBackgroundColor(BACKGROUND_COLORS.HOME_BLUE);
  }, [setBackgroundColor]);

  const handlePlayAudio = (audioItem: any) => {
    // Validate the audio item and URL before attempting to play
    if (!audioItem) {
      toast.error("Cannot play audio: Missing audio data");
      return;
    }
    
    if (!audioItem.audio_url || typeof audioItem.audio_url !== 'string' || audioItem.audio_url.trim() === '') {
      toast.error("This audio file can't be played. It may be missing or unavailable.");
      console.error("Invalid audio URL:", audioItem.audio_url);
      return;
    }
    
    // Check if URL is valid before setting the playing audio
    try {
      // Basic validation - ensure it's a well-formed URL
      new URL(audioItem.audio_url);
      setPlayingAudio(audioItem);
    } catch (error) {
      console.error("Invalid audio URL format:", audioItem.audio_url, error);
      toast.error("Invalid audio file URL. Please try another track.");
    }
  };

  const handleProgressUpdate = (seconds: number) => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, seconds);
  };

  const handleComplete = () => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, playingAudio.duration, true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 pt-20 pb-24 text-black font-sans bg-attune-blue">
      {/* Mobile container with fixed max-width */}
      <div className="w-full max-w-[390px] mx-auto">
        {/* Add logo at the top of the page for both logged in and logged out states */}
        <div className="mb-8 flex justify-center">
          <AttuneLogo />
        </div>

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
