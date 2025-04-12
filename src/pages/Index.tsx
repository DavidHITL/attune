
import React, { useEffect, useState } from 'react';
import AttuneContent from '@/components/AttuneContent';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import AudioPlayer from '@/components/audio/AudioPlayer';
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
  const [isAudioValidating, setIsAudioValidating] = useState(false);

  useEffect(() => {
    // Use the lighter blue color for this page
    setBackgroundColor(BACKGROUND_COLORS.HOME_BLUE);
  }, [setBackgroundColor]);

  // Helper function to validate audio URLs
  const isValidAudioUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    try {
      new URL(url); // Test if URL is well-formed
      return true;
    } catch (e) {
      console.error("Malformed URL:", url, e);
      return false;
    }
  };

  const handlePlayAudio = (audioItem: any) => {
    if (!audioItem) {
      toast.error("Cannot play audio: Missing audio data");
      return;
    }
    
    if (!isValidAudioUrl(audioItem.audio_url)) {
      toast.error("This audio file can't be played. It may be missing or unavailable.");
      console.error("Invalid audio URL:", audioItem.audio_url);
      return;
    }
    
    // Set audio validating state
    setIsAudioValidating(true);
    
    // Check if audio file exists before setting it
    // Use an AbortController to ensure the request can be cancelled if component unmounts
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Append a unique parameter to prevent caching issues
    const cacheBuster = `?cb=${Date.now()}`;
    const urlToCheck = audioItem.audio_url.includes('?') 
      ? `${audioItem.audio_url}&cb=${Date.now()}` 
      : `${audioItem.audio_url}${cacheBuster}`;
    
    fetch(urlToCheck, { 
      method: 'HEAD',
      signal,
      credentials: 'same-origin',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
      .then(response => {
        setIsAudioValidating(false);
        if (response.ok) {
          console.log("Audio file exists, setting playing audio");
          
          // Create a new object to avoid any reference issues
          setPlayingAudio({
            ...audioItem,
            // Ensure we use the original URL without cache busting for stable playback
            audio_url: audioItem.audio_url
          });
        } else {
          console.error("Audio file not found:", audioItem.audio_url);
          toast.error("Audio file not found. Please try another track.");
        }
      })
      .catch(error => {
        setIsAudioValidating(false);
        // Only show error if not aborted
        if (!signal.aborted) {
          console.error("Error checking audio file:", error);
          toast.error("Error checking audio file. Please try again later.");
        }
      });
    
    // Return cleanup function to abort fetch if component unmounts
    return () => controller.abort();
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
        {/* Always render AttuneContent for non-logged in users */}
        {!user ? (
          <AttuneContent />
        ) : !loading ? (
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
            
            {/* Loading indicator */}
            {isAudioValidating && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xl"></div>
                <div className="relative z-10 bg-white p-6 rounded-lg shadow-xl text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-4"></div>
                  <p>Loading audio...</p>
                </div>
              </div>
            )}
            
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
        )}
      </div>
    </div>
  );
};

export default Index;
