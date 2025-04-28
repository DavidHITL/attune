
import { QueuedMessage } from './types';

/**
 * Extended queue processing options
 */
export interface QueueProcessingOptions {
  maxRetries: number;
  retryDelay: number;
  processingInterval: number;
}

/**
 * Queue processor status with detailed information
 */
export interface DetailedQueueStatus extends QueueStatus {
  isProcessing: boolean;
  lastProcessedMessageType?: 'user' | 'assistant';
  lastProcessTime?: number;
}

/**
 * Result of a message processing operation
 */
export interface ProcessingResult {
  success: boolean;
  messageId?: string;
  error?: Error;
}

/**
 * Queue status information
 */
export interface QueueStatus { 
  queueLength: number; 
  pendingUserMessages: number; 
  activeSaves: number;
}
