
import React, { useEffect } from 'react';
import { AttuneHero } from '@/components/AttuneContent';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import AudioContentSection from '@/components/audio/AudioContentSection';
import AudioPlayer from '@/components/audio/AudioPlayer';
import AudioLoadingState from '@/components/audio/AudioLoadingState';
import AuthSection from '@/components/audio/AuthSection';

const Index = () => {
  const { setBackgroundColor } = useBackground();
  const { user } = useAuth();
  const {
    loading,
    featuredContent,
    audioContent,
    updateProgress
  } = useAudioLibrary();
  
  const {
    playingAudio,
    isAudioValidating,
    handlePlayAudio,
    handleProgressUpdate,
    handleComplete,
    setPlayingAudio
  } = useAudioPlayback({ updateProgress });

  useEffect(() => {
    // Use the lighter blue color for this page
    setBackgroundColor(BACKGROUND_COLORS.HOME_BLUE);
  }, [setBackgroundColor]);
  
  // Handler for selecting audio from the grid or featured content
  const handleSelectAudio = (id: string) => {
    const audio = id === featuredContent?.id 
      ? featuredContent 
      : audioContent.find(item => item.id === id);
      
    if (audio) handlePlayAudio(audio);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 pt-20 pb-24 text-black font-sans bg-attune-blue">
      {/* Mobile container with fixed max-width */}
      <div className="w-full max-w-[390px] mx-auto">
        {/* Always show the hero section with logo and quote */}
        <AttuneHero />
        
        {/* Show login button for non-logged in users */}
        <AuthSection isLoggedIn={!!user} />
        
        {/* Show audio content for logged in users */}
        <AudioContentSection 
          isLoggedIn={!!user} 
          isLoading={loading} 
          featuredContent={featuredContent} 
          audioContent={audioContent} 
          onSelectAudio={handleSelectAudio}
        />
        
        {/* Show loading indicators */}
        <AudioLoadingState 
          isLoading={!!user && loading} 
          isAudioValidating={isAudioValidating} 
        />
        
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
      </div>
    </div>
  );
};

export default Index;
