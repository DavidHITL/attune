
/**
 * DEPRECATED: This handler is now disabled. All event processing goes through EventDispatcher.
 * Kept for backwards compatibility but does nothing.
 */
import { EventTypeRegistry } from './EventTypeRegistry';
import { toast } from 'sonner';

export class TranscriptEventHandler {
  private lastTranscriptContent: string = '';
  
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // COMPLETELY DISABLED: This handler is now deprecated
    // All transcript events are now handled by the EventDispatcher
    console.log(`[TranscriptEventHandler] DISABLED: Event received but not processed: ${event.type}`);
  }
}
