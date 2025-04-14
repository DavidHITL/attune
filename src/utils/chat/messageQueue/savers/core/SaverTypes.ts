
import { Message } from '../../../../types';

/**
 * Result of a message save operation
 */
export interface SaveResult {
  success: boolean;
  savedMessage: Message | null;
  error?: Error;
}

/**
 * Options for saving messages
 */
export interface SaveOptions {
  trackId?: string;
  maxRetries?: number;
  showNotification?: boolean;
  checkTerryRealCompliance?: boolean; // New option to check if message follows Terry Real approach
}
