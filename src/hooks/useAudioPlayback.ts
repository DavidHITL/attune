
import { useState } from 'react';
import { toast } from 'sonner';
import { isValidAudioUrl } from '@/hooks/audio/utils/audioValidation';

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

  const handlePlayAudio = (audioItem: AudioItem) => {
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

  return {
    playingAudio,
    isAudioValidating,
    handlePlayAudio,
    handleProgressUpdate,
    handleComplete,
    setPlayingAudio
  };
}
