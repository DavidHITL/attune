
import { useState } from 'react';
import { getAudioDuration } from '@/utils/formatters';

interface UseAudioUploadReturn {
  audioFile: File | null;
  handleAudioUploaded: (url: string, file: File) => void;
  setAudioFile: React.Dispatch<React.SetStateAction<File | null>>;
}

export function useAudioUpload(
  updateFormData: (updates: Partial<{
    audio_url: string;
    duration: number;
  }>) => void
): UseAudioUploadReturn {
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleAudioUploaded = (url: string, file: File) => {
    console.log("Audio file uploaded successfully:", url);
    setAudioFile(file);
    updateFormData({ audio_url: url });
    
    // Try to get audio duration if possible
    if (window.Audio) {
      const audio = new Audio();
      audio.src = url;
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          updateFormData({ duration: Math.round(audio.duration) });
        }
      });
    }
  };

  return {
    audioFile,
    handleAudioUploaded,
    setAudioFile
  };
}
