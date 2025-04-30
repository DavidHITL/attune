
/**
 * COMPLETELY DISABLED AND DEPRECATED:
 * This handler is now completely inactive and deprecated.
 * All event processing must go through EventDispatcher exclusively.
 * 
 * @deprecated Use EventDispatcher instead for all event processing
 */
export class TranscriptEventHandler {
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // DISABLED: Do nothing - all events are processed by EventDispatcher
    console.log(`[TranscriptEventHandler] DEPRECATED: Event ignored: ${event.type}`);
    console.log(`[TranscriptEventHandler] Use EventDispatcher for all event processing`);
    return;
  }
}
