import { useState } from 'react';
import { toast } from 'sonner';
import { isValidAudioUrl } from '@/hooks/audio/utils/audioValidation';
import { checkAudioAvailability } from '@/hooks/audio/utils/audioValidation';
import { audioCache } from '@/hooks/audio/utils/cache';

export interface AudioItem {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration: number;
  progress?: {
    progress_seconds: number | null;
    completed: boolean | null;
  } | null;
}

interface UseAudioPlaybackProps {
  updateProgress: (contentId: string, seconds: number, completed?: boolean) => Promise<any>;
}

export function useAudioPlayback({ updateProgress }: UseAudioPlaybackProps) {
  const [playingAudio, setPlayingAudio] = useState<AudioItem | null>(null);
  const [isAudioValidating, setIsAudioValidating] = useState(false);

  const handlePlayAudio = async (audioItem: AudioItem) => {
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
    
    try {
      // Check if audio is already cached
      if (audioCache.isAudioCached(audioItem.audio_url)) {
        console.log("Using cached audio for playback:", audioItem.title);
        setIsAudioValidating(false);
        setPlayingAudio({...audioItem});
        return;
      }
      
      // Check if audio file exists before setting it
      const audioExists = await checkAudioAvailability(audioItem.audio_url);
      
      setIsAudioValidating(false);
      
      if (audioExists) {
        console.log("Audio file exists, setting playing audio");
        
        // Create a new object to avoid any reference issues
        setPlayingAudio({
          ...audioItem,
          // Ensure we use the original URL for stable playback
          audio_url: audioItem.audio_url
        });
      } else {
        console.error("Audio file not found:", audioItem.audio_url);
        toast.error("Audio file not found. Please try another track.");
      }
    } catch (error) {
      setIsAudioValidating(false);
      console.error("Error checking audio file:", error);
      toast.error("Error checking audio file. Please try again later.");
    }
  };

  const handleProgressUpdate = (seconds: number) => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, seconds);
  };

  const handleComplete = () => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, playingAudio.duration, true);
    // Show completion message
    toast.success("Audio playback completed!");
  };

  const clearAudioCache = () => {
    audioCache.clearCache();
    toast.success("Audio cache cleared");
  };

  return {
    playingAudio,
    isAudioValidating,
    handlePlayAudio,
    handleProgressUpdate,
    handleComplete,
    setPlayingAudio,
    clearAudioCache
  };
}
