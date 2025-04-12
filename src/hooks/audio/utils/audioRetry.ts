
import { createCacheBustedUrl } from './audioValidation';

export interface RetryConfig {
  maxRetries: number;
  onMaxRetriesReached?: (error: Error) => void;
}

/**
 * Handle audio loading error with retry logic
 */
export function handleAudioLoadError(
  audio: HTMLAudioElement,
  audioUrl: string,
  retryCountRef: { current: number },
  retryConfig: RetryConfig
): void {
  const { maxRetries, onMaxRetriesReached } = retryConfig;
  
  if (retryCountRef.current < maxRetries) {
    retryCountRef.current += 1;
    console.log(`Retry attempt ${retryCountRef.current}/${maxRetries}`);
    
    // Key fix: Use a setTimeout to ensure a complete reset before retry
    setTimeout(() => {
      audio.pause();
      
      // Generate a unique URL with cache-busting
      const retryUrl = createCacheBustedUrl(audioUrl, retryCountRef.current);
      
      // Clear any previous errors
      audio.onerror = null;
      
      // Set preload to auto
      audio.preload = "auto";
      
      // Set crossOrigin to anonymous to handle CORS issues
      audio.crossOrigin = "anonymous";
      
      // First remove any existing source
      audio.removeAttribute('src');
      audio.load();
      
      // Then set source explicitly after a brief delay
      setTimeout(() => {
        audio.src = retryUrl;
        audio.load(); // Force loading
      }, 100);
    }, 300);
  } else {
    console.error("Max retries reached for audio loading");
    if (onMaxRetriesReached) {
      onMaxRetriesReached(new Error(`Failed to load audio after ${maxRetries} attempts`));
    }
  }
}
