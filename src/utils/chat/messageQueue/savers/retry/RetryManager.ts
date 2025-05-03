
/**
 * Manages retry logic for message saving
 */
export class RetryManager {
  /**
   * Execute function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>, 
    options: {
      maxAttempts: number, 
      retryDelay: (attempt: number) => number,
      onRetry?: (attempt: number, error: Error) => void,
      shouldRetry?: (error: Error) => boolean
    }
  ): Promise<T> {
    const { maxAttempts, retryDelay, onRetry, shouldRetry } = options;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }
        
        if (attempt < maxAttempts) {
          const delay = retryDelay(attempt);
          
          // Notify about retry
          if (onRetry) {
            onRetry(attempt, lastError);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }
    
    // This should never happen due to the throw in the loop, but TypeScript needs it
    throw lastError || new Error('Operation failed after all retry attempts');
  }
  
  /**
   * Calculate exponential backoff delay
   */
  exponentialDelay(attempt: number, baseDelayMs: number = 1000): number {
    return Math.min(
      baseDelayMs * Math.pow(2, attempt - 1),
      30000 // Cap at 30 seconds
    );
  }
}
