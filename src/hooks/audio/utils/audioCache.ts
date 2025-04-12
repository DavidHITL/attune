
interface CachedAudio {
  url: string;
  blob: Blob;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache for audio blobs
 * This improves playback reliability by avoiding repeated downloads
 */
class AudioCacheService {
  private cache: Map<string, CachedAudio>;
  private maxCacheSize: number; // Maximum number of items in cache
  private cacheExpiration: number; // Expiration time in milliseconds (default 1 hour)
  private storageKey = 'audio_cache_status';
  
  constructor(maxSize = 10, expirationMs = 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxCacheSize = maxSize;
    this.cacheExpiration = expirationMs;
    this.loadCacheStatus();
  }
  
  /**
   * Store an audio blob in the cache
   */
  async cacheAudio(url: string, audioBlob: Blob): Promise<void> {
    // Normalize URL by removing cache busting parameters
    const normalizedUrl = this.normalizeUrl(url);
    
    // Create cache entry
    const cacheEntry: CachedAudio = {
      url: normalizedUrl,
      blob: audioBlob,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheExpiration
    };
    
    // If cache is full, remove oldest item
    if (this.cache.size >= this.maxCacheSize) {
      this.removeOldestEntry();
    }
    
    // Add to cache
    this.cache.set(normalizedUrl, cacheEntry);
    console.log(`[AudioCache] Cached audio for ${normalizedUrl}`);
    
    // Save cache status (but not the blobs themselves)
    this.saveCacheStatus();
  }
  
  /**
   * Get an audio blob from the cache if available
   */
  getAudio(url: string): Blob | null {
    // Normalize URL by removing cache busting parameters
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check if URL exists in cache and hasn't expired
    const cacheEntry = this.cache.get(normalizedUrl);
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > cacheEntry.expiresAt) {
      console.log(`[AudioCache] Cache entry for ${normalizedUrl} has expired`);
      this.cache.delete(normalizedUrl);
      this.saveCacheStatus();
      return null;
    }
    
    console.log(`[AudioCache] Using cached audio for ${normalizedUrl}`);
    return cacheEntry.blob;
  }
  
  /**
   * Check if an audio URL is cached
   */
  isAudioCached(url: string): boolean {
    return this.getAudio(this.normalizeUrl(url)) !== null;
  }
  
  /**
   * Clear all cached audio entries
   */
  clearCache(): void {
    this.cache.clear();
    this.saveCacheStatus();
    console.log('[AudioCache] Cache cleared');
  }
  
  /**
   * Remove expired entries from the cache
   */
  cleanExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    });
    
    if (expiredCount > 0) {
      console.log(`[AudioCache] Removed ${expiredCount} expired entries`);
      this.saveCacheStatus();
    }
  }
  
  /**
   * Remove the oldest entry from the cache
   */
  private removeOldestEntry(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    // Find the oldest entry
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    // Remove oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[AudioCache] Removed oldest entry: ${oldestKey}`);
    }
  }
  
  /**
   * Normalize a URL by removing cache busting parameters
   */
  private normalizeUrl(url: string): string {
    try {
      // Create URL object
      const urlObj = new URL(url);
      
      // Remove cache busting parameters (_cb, retry)
      urlObj.searchParams.delete('_cb');
      urlObj.searchParams.delete('retry');
      urlObj.searchParams.delete('cb');
      
      return urlObj.toString();
    } catch (e) {
      // If URL is invalid, return it as is
      return url;
    }
  }
  
  /**
   * Save cache status to localStorage (not the blobs themselves)
   */
  private saveCacheStatus(): void {
    try {
      // Create a simplified cache representation without blobs
      const cacheStatus = Array.from(this.cache.entries()).map(([key, entry]) => ({
        url: key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      }));
      
      localStorage.setItem(this.storageKey, JSON.stringify(cacheStatus));
    } catch (e) {
      console.error('[AudioCache] Error saving cache status:', e);
    }
  }
  
  /**
   * Load cache status from localStorage (to track what's been cached)
   */
  private loadCacheStatus(): void {
    try {
      const cacheStatus = localStorage.getItem(this.storageKey);
      if (!cacheStatus) return;
      
      // Just load the status; we can't restore the blobs from localStorage
      // This is mainly for debugging/analytics purposes
      const status = JSON.parse(cacheStatus);
      console.log(`[AudioCache] Found records of ${status.length} cached items`);
      
      // Clean expired entries based on the status
      this.cleanExpiredEntries();
    } catch (e) {
      console.error('[AudioCache] Error loading cache status:', e);
    }
  }
}

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
  console.log(`[AudioCache] Fetching audio: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Cache the blob
    await audioCache.cacheAudio(url, blob);
    
    return blob;
  } catch (error) {
    console.error(`[AudioCache] Error fetching audio: ${url}`, error);
    throw error;
  }
}

/**
 * Create an object URL from cached audio or by fetching
 */
export async function getAudioObjectUrl(url: string): Promise<string> {
  try {
    const blob = await fetchAndCacheAudio(url);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`[AudioCache] Error creating object URL for ${url}`, error);
    // Fall back to original URL if caching fails
    return url;
  }
}

