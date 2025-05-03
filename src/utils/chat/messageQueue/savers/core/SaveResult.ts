
import { Message } from '@/utils/types';

export interface SaveResult {
  success: boolean;
  savedMessage?: Message | null;
  error?: Error;
}
