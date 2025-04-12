
/**
 * Utility functions for audio URL validation
 */

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
  const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 10);
  const retryParam = attempt > 0 ? `&retry=${attempt}` : '';
  
  return url.includes('?') 
    ? `${url}&_cb=${cacheBuster}${retryParam}`
    : `${url}?_cb=${cacheBuster}${retryParam}`;
}
