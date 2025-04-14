
import React, { useEffect } from 'react';
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer';
import { isValidAudioUrl } from '@/hooks/audio/utils/audioValidation';
import PlayerModal from './PlayerModal';
import PlayerErrorState from './PlayerErrorState';
import PlayerHeader from './PlayerHeader';
import PlayerError from './PlayerError';
import AudioProgress from './AudioProgress';
import AudioControls from './AudioControls';
import { audioCache } from '@/hooks/audio/utils/cache';

interface AudioPlayerProps {
  title: string;
  description?: string | null;
  audioUrl: string;
  coverImage?: string | null;
  initialProgress?: number;
  onClose: () => void;
  onProgressUpdate: (seconds: number) => void;
  onComplete: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title,
  description,
  audioUrl,
  coverImage,
  initialProgress = 0,
  onClose,
  onProgressUpdate,
  onComplete
}) => {
  // Show error state if URL is invalid
  if (!isValidAudioUrl(audioUrl)) {
    return (
      <PlayerModal onClose={onClose}>
        <PlayerErrorState onClose={onClose} />
      </PlayerModal>
    );
  }

  const {
    isPlaying,
    duration,
    currentTime,
    loaded,
    error,
    togglePlayPause,
    handleSeek,
    skipBackward,
    skipForward,
    rewind30,
    forward15
  } = useAudioPlayer({
    audioUrl,
    initialProgress,
    onProgressUpdate,
    onComplete
  });

  return (
    <PlayerModal onClose={onClose}>
      <PlayerHeader 
        title={title}
        description={description}
        coverImage={coverImage}
        isCached={audioCache.isAudioCached(audioUrl)}
      />
      
      {(error) && <PlayerError error={error} />}
      
      <AudioProgress
        currentTime={currentTime}
        duration={duration}
        loaded={loaded}
        onSeek={handleSeek}
      />
      
      <AudioControls 
        isPlaying={isPlaying}
        loaded={loaded}
        onTogglePlay={togglePlayPause}
        onSkipBackward={skipBackward}
        onComplete={onComplete}
        onRewind30={rewind30}
        onForward15={forward15}
      />
    </PlayerModal>
  );
};

export default AudioPlayer;
