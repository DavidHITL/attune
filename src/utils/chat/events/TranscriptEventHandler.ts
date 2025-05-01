
/**
 * DEPRECATED AND REMOVED:
 * This handler has been completely removed as all event processing 
 * now goes through EventDispatcher exclusively.
 */
export class TranscriptEventHandler {
  // Class is kept as an empty implementation for backward compatibility
  constructor() {
    console.log('[TranscriptEventHandler] ⚠️ This component is deprecated. Using EventDispatcher instead.');
  }
}
