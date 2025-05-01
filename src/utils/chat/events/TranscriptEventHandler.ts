
import { toast } from 'sonner';

/**
 * @deprecated This handler is completely disabled.
 * UserEventHandler integrated with EventDispatcher is now the only handler for user speech events.
 */
export class TranscriptEventHandler {
  constructor(
    private saveUserMessage: (text: string) => void
  ) {
    console.warn('[TranscriptEventHandler] ⚠️ DEPRECATED - Completely disabled - Use UserEventHandler with EventDispatcher instead');
  }
  
  handleTranscriptEvents(event: any): void {
    // No-op - all transcript events are now handled by EventDispatcher
    console.warn(`[TranscriptEventHandler] ⚠️ DEPRECATED - This handler is disabled and no longer processes events.`);
  }
}
