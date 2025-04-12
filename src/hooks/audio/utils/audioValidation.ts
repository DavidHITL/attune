
/**
 * Utility functions for audio URL validation and processing
 */
import { audioCache } from './audioCache';

/**
 * Validates if a URL is properly formatted and non-empty
 */
export function isValidAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.error("Empty or invalid audio URL:", url);
    return false;
  }
  
  try {
    new URL(url); // Tests if URL is well-formed
    return true;
  } catch (e) {
    console.error("Malformed URL:", url, e);
    return false;
  }
}

/**
 * Create URL with cache-busting parameter
 */
export function createCacheBustedUrl(url: string, attempt = 0): string {
  // If we already have this audio in cache, no need for cache busting
  if (audioCache.isAudioCached(url)) {
    console.log("[AudioValidation] Using cached audio, no cache busting needed");
    return url;
  }
  
  const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 10);
  const retryParam = attempt > 0 ? `&retry=${attempt}` : '';
  
  return url.includes('?') 
    ? `${url}&_cb=${cacheBuster}${retryParam}`
    : `${url}?_cb=${cacheBuster}${retryParam}`;
}

/**
 * Check if audio file is available by performing a lightweight HEAD request
 */
export async function checkAudioAvailability(url: string): Promise<boolean> {
  // If already cached, we know it's available
  if (audioCache.isAudioCached(url)) {
    return true;
  }
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    });
    return response.ok;
  } catch (error) {
    console.error("Error checking audio availability:", error);
    return false;
  }
}

