
/**
 * Configure and initialize an audio element with proper event listeners
 */
export function setupAudioElement(
  audio: HTMLAudioElement,
  {
    onMetadataLoaded,
    onTimeUpdate,
    onEnded,
    onError,
    initialPosition = 0
  }: {
    onMetadataLoaded?: (duration: number) => void;
    onTimeUpdate?: (currentTime: number) => void;
    onEnded?: () => void;
    onError?: (e: Event) => void;
    initialPosition?: number;
  }
) {
  // Set up event listeners before setting src
  if (onMetadataLoaded) {
    audio.addEventListener('loadedmetadata', () => {
      console.log("Audio metadata loaded, duration:", audio.duration);
      onMetadataLoaded(audio.duration);
      
      // Set initial position if provided (only after metadata is loaded)
      if (initialPosition > 0) {
        audio.currentTime = initialPosition;
      }
    });
  }
  
  if (onTimeUpdate) {
    audio.addEventListener('timeupdate', () => {
      onTimeUpdate(audio.currentTime);
    });
  }
  
  if (onEnded) {
    audio.addEventListener('ended', onEnded);
  }
  
  if (onError) {
    audio.addEventListener('error', onError);
  }
  
  // Configure audio element
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  
  return audio;
}

/**
 * Clean up all event listeners from an audio element
 */
export function cleanupAudioElement(audio: HTMLAudioElement): void {
  if (!audio) return;
  
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  
  // Remove all event listeners
  audio.onloadedmetadata = null;
  audio.ontimeupdate = null;
  audio.onended = null;
  audio.onplay = null;
  audio.onpause = null;
  audio.onerror = null;
}
