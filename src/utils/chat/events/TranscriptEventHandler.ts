
/**
 * COMPLETELY DISABLED: This handler is now completely inactive.
 * All event processing goes through EventDispatcher exclusively.
 */
export class TranscriptEventHandler {
  constructor(
    private saveUserMessage: (text: string) => void
  ) {}
  
  handleTranscriptEvents(event: any): void {
    // DISABLED: Do nothing - all events are processed by EventDispatcher
    console.log(`[TranscriptEventHandler] DISABLED: Event ignored: ${event.type}`);
    return;
  }
}
