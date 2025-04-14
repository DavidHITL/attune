
export interface CachedAudio {
  url: string;
  blob: Blob;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStatus {
  url: string;
  timestamp: number;
  expiresAt: number;
}
