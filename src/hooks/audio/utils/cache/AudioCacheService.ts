
import { CachedAudio, CacheStatus } from './types';
import { normalizeUrl } from './urlUtils';
import { fetchAudioBlob, createAudioObjectUrl } from './audioBlobService';

export class AudioCacheService {
  private cache: Map<string, CachedAudio>;
  private maxCacheSize: number;
  private cacheExpiration: number;
  private storageKey = 'audio_cache_status';
  
  constructor(maxSize = 10, expirationMs = 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxCacheSize = maxSize;
    this.cacheExpiration = expirationMs;
    this.loadCacheStatus();
  }
  
  async cacheAudio(url: string, audioBlob: Blob): Promise<void> {
    const normalizedUrl = normalizeUrl(url);
    
    const cacheEntry: CachedAudio = {
      url: normalizedUrl,
      blob: audioBlob,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheExpiration
    };
    
    if (this.cache.size >= this.maxCacheSize) {
      this.removeOldestEntry();
    }
    
    this.cache.set(normalizedUrl, cacheEntry);
    console.log(`[AudioCache] Cached audio for ${normalizedUrl}`);
    
    this.saveCacheStatus();
  }
  
  getAudio(url: string): Blob | null {
    const normalizedUrl = normalizeUrl(url);
    const cacheEntry = this.cache.get(normalizedUrl);
    
    if (!cacheEntry) return null;
    
    if (Date.now() > cacheEntry.expiresAt) {
      console.log(`[AudioCache] Cache entry for ${normalizedUrl} has expired`);
      this.cache.delete(normalizedUrl);
      this.saveCacheStatus();
      return null;
    }
    
    console.log(`[AudioCache] Using cached audio for ${normalizedUrl}`);
    return cacheEntry.blob;
  }
  
  isAudioCached(url: string): boolean {
    return this.getAudio(normalizeUrl(url)) !== null;
  }
  
  clearCache(): void {
    this.cache.clear();
    this.saveCacheStatus();
    console.log('[AudioCache] Cache cleared');
  }
  
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
  
  private removeOldestEntry(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[AudioCache] Removed oldest entry: ${oldestKey}`);
    }
  }
  
  private saveCacheStatus(): void {
    try {
      const cacheStatus: CacheStatus[] = Array.from(this.cache.entries()).map(([key, entry]) => ({
        url: key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      }));
      
      localStorage.setItem(this.storageKey, JSON.stringify(cacheStatus));
    } catch (e) {
      console.error('[AudioCache] Error saving cache status:', e);
    }
  }
  
  private loadCacheStatus(): void {
    try {
      const cacheStatus = localStorage.getItem(this.storageKey);
      if (!cacheStatus) return;
      
      const status = JSON.parse(cacheStatus);
      console.log(`[AudioCache] Found records of ${status.length} cached items`);
      
      this.cleanExpiredEntries();
    } catch (e) {
      console.error('[AudioCache] Error loading cache status:', e);
    }
  }
}
