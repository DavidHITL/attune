
import { Message } from '../../types';

export interface UserMessageOptions {
  priority?: boolean;
  source?: string;
  metadata?: Record<string, any>;
}

export interface TranscriptOptions {
  isFinal?: boolean;
  confidence?: number;
  source?: string;
}

export type MessageSaveResult = {
  success: boolean;
  message?: Message;
  error?: Error;
};

export type TranscriptSource = 'direct' | 'accumulated' | 'buffer' | 'disconnect';
