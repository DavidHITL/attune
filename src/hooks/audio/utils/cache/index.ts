
import { AudioCacheService } from './AudioCacheService';
import { fetchAudioBlob, createAudioObjectUrl } from './audioBlobService';

// Export singleton instance
export const audioCache = new AudioCacheService();

/**
 * Fetch and cache an audio file
 */
export async function fetchAndCacheAudio(url: string): Promise<Blob> {
  // First check if already cached
  const cachedBlob = audioCache.getAudio(url);
  if (cachedBlob) {
    return cachedBlob;
  }
  
  // If not cached, fetch it
  const blob = await fetchAudioBlob(url);
  
  // Cache the blob
  await audioCache.cacheAudio(url, blob);
  
  return blob;
}

/**
 * Create an object URL from cached audio or by fetching
 */
export async function getAudioObjectUrl(url: string): Promise<string> {
  try {
    const blob = await fetchAndCacheAudio(url);
    return createAudioObjectUrl(blob);
  } catch (error) {
    console.error(`[AudioCache] Error creating object URL for ${url}`, error);
    // Fall back to original URL if caching fails
    return url;
  }
}

export type { CachedAudio } from './types';
