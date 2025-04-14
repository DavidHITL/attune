
/**
 * Normalize a URL by removing cache busting parameters
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove cache busting parameters
    urlObj.searchParams.delete('_cb');
    urlObj.searchParams.delete('retry');
    urlObj.searchParams.delete('cb');
    
    return urlObj.toString();
  } catch (e) {
    // If URL is invalid, return it as is
    return url;
  }
}
