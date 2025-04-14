
/**
 * Fetch and cache an audio file
 */
export async function fetchAudioBlob(url: string): Promise<Blob> {
  console.log(`[AudioCache] Fetching audio: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error(`[AudioCache] Error fetching audio: ${url}`, error);
    throw error;
  }
}

/**
 * Create an object URL from a blob
 */
export function createAudioObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
