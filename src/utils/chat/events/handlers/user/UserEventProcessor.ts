
/**
 * Main user event processor that coordinates all components
 */
import { EventTypeRegistry } from '../../EventTypeRegistry';
import { MessageQueue } from '../../../messageQueue';
import { DeltaAccumulator } from './DeltaAccumulator';
import { TranscriptContentExtractor } from './TranscriptContentExtractor';
import { TranscriptProcessor } from './TranscriptProcessor';

export class UserEventProcessor {
  private deltaAccumulator: DeltaAccumulator;
  private transcriptExtractor: TranscriptContentExtractor;
  private transcriptProcessor: TranscriptProcessor;
  private debugEnabled: boolean;
  private eventCounter: number = 0;
  private lastEventProcessTime: number = 0;
  private emptyEventStreak: number = 0;
  private maxEmptyStreak: number = 5;
  private verboseLogging: boolean = true;
  
  constructor(private messageQueue: MessageQueue, debugEnabled: boolean = true) {
    this.deltaAccumulator = new DeltaAccumulator();
    this.transcriptExtractor = new TranscriptContentExtractor(debugEnabled);
    this.transcriptProcessor = new TranscriptProcessor(messageQueue);
    this.debugEnabled = debugEnabled;
    this.verboseLogging = true;
    
    console.log('[UserEventProcessor] Initialized with debug mode:', debugEnabled);
    
    // Set up periodic checks for accumulated content
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForStalledContent(), 1000);
    }
  }
  
  /**
   * Process an event and attempt to extract and save transcript content
   */
  processEvent(event: any): void {
    this.eventCounter++;
    const eventId = this.eventCounter;
    const startTime = Date.now();
    
    if (this.verboseLogging || this.eventCounter % 20 === 0) {
      console.log(`[UserEventProcessor] #${eventId} Processing event type: ${event.type}`, {
        timestamp: new Date().toISOString(),
        eventType: event.type,
        eventId
      });
    }
    
    // Verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      if (this.verboseLogging) {
        console.log(`[UserEventProcessor] #${eventId} Event ${event.type} is not a user event, skipping`);
      }
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole: 'user' | 'assistant' = 'user';
    
    // Extract content from the event
    const { content: transcriptContent, isDelta } = this.transcriptExtractor.extractContent(event);
    
    // If no content was found but this is a delta event, increment empty streak counter
    if (!transcriptContent && event.type === 'response.audio_transcript.delta') {
      this.emptyEventStreak++;
      
      if (this.emptyEventStreak >= this.maxEmptyStreak) {
        console.warn(`[UserEventProcessor] #${eventId} ⚠️ ${this.emptyEventStreak} consecutive empty delta events detected!`);
        
        // On consecutive empty events, force a deep dump of one of the events
        if (this.emptyEventStreak === this.maxEmptyStreak) {
          console.warn(`[UserEventProcessor] #${eventId} ⚠️ Debug dump of delta event:`, 
            JSON.stringify(event, null, 2).substring(0, 1000) + (JSON.stringify(event).length > 1000 ? '...' : '')
          );
        }
      }
    } else {
      // Reset empty streak counter if we found content
      this.emptyEventStreak = 0;
    }
    
    // For delta events, accumulate content
    if (isDelta && transcriptContent) {
      this.deltaAccumulator.accumulateDelta(transcriptContent);
      
      if (this.verboseLogging) {
        console.log(`[UserEventProcessor] #${eventId} Accumulating delta: "${transcriptContent}" (total: ${this.deltaAccumulator.getAccumulatedContent().length} chars)`, {
          deltaLength: transcriptContent.length,
          totalAccumulated: this.deltaAccumulator.getAccumulatedContent().length,
          timestamp: new Date().toISOString(),
          eventId
        });
      }
      
      // Check if we should process accumulated deltas
      if (this.deltaAccumulator.shouldProcessAccumulated() || 
          this.deltaAccumulator.hasSubstantialContent()) {
        
        const accumulatedContent = this.deltaAccumulator.getAccumulatedContent();
        this.deltaAccumulator.markProcessed();
        
        console.log(`[UserEventProcessor] #${eventId} Processing accumulated deltas: "${accumulatedContent.substring(0, 50)}${accumulatedContent.length > 50 ? '...' : ''}"`, {
          contentLength: accumulatedContent.length,
          timestamp: new Date().toISOString(),
          eventId,
          contentSample: accumulatedContent.substring(0, 100)
        });
        this.transcriptProcessor.saveUserMessage(accumulatedContent, forcedRole);
      }
      
      this.lastEventProcessTime = Date.now();
      return;
    }
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      if (this.verboseLogging) {
        console.log(`[UserEventProcessor] #${eventId} Empty transcript in ${event.type}, skipping`);
      }
      this.lastEventProcessTime = Date.now();
      return;
    }
    
    // Process and save the transcript
    console.log(`[UserEventProcessor] #${eventId} Processing direct transcript: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`, {
      contentLength: transcriptContent.length,
      timestamp: new Date().toISOString(),
      eventId,
      processingTime: Date.now() - startTime
    });
    this.transcriptProcessor.saveUserMessage(transcriptContent, forcedRole);
    this.lastEventProcessTime = Date.now();
  }
  
  /**
   * Check for stalled content periodically and force a flush if needed
   */
  private checkForStalledContent(): void {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastEventProcessTime;
    const accumulatedContent = this.deltaAccumulator.getAccumulatedContent();
    
    // If we have accumulated content but haven't processed an event for 2 seconds
    if (accumulatedContent && accumulatedContent.trim() !== '' && timeSinceLastProcess > 2000) {
      console.log(`[UserEventProcessor] Found stalled content after ${timeSinceLastProcess}ms of inactivity, force flushing`);
      this.flushAccumulatedTranscript();
    }
  }
  
  /**
   * Flush accumulated transcript even if time threshold hasn't been met
   * Enhanced to ensure any content is saved regardless of length or content quality
   */
  flushAccumulatedTranscript(): void {
    const accumulatedContent = this.deltaAccumulator.getAccumulatedContent();
    
    // Enhanced logic to force-save even minimal content
    if (accumulatedContent) {
      // Log the force flush with content preview
      console.log(`[UserEventProcessor] Forcing flush of accumulated transcript: "${accumulatedContent.substring(0, 50)}${accumulatedContent.length > 50 ? '...' : ''}"`, {
        contentLength: accumulatedContent.length,
        timestamp: new Date().toISOString(),
        contentWords: accumulatedContent.split(' ').length,
        contentSample: accumulatedContent.substring(0, 100)
      });
      
      // Save with high priority flag to ensure immediate processing
      this.transcriptProcessor.saveUserMessage(accumulatedContent, 'user', true);
      
      // Reset accumulator after saving
      this.deltaAccumulator.reset();
      console.log('[UserEventProcessor] Accumulator reset after forced flush');
    } else {
      console.log('[UserEventProcessor] No accumulated content to flush');
    }
    
    // Update last process time
    this.lastEventProcessTime = Date.now();
  }
  
  /**
   * Check if there are consecutive empty events, suggesting a possible issue
   */
  hasConsecutiveEmptyEvents(): boolean {
    return this.emptyEventStreak >= this.maxEmptyStreak;
  }
  
  /**
   * Set verbose logging mode
   */
  setVerboseLogging(verbose: boolean): void {
    this.verboseLogging = verbose;
    console.log(`[UserEventProcessor] Verbose logging ${verbose ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get debugging statistics
   */
  getDebugStats(): object {
    return {
      totalEventsProcessed: this.eventCounter,
      emptyEventStreak: this.emptyEventStreak,
      timeSinceLastProcess: Date.now() - this.lastEventProcessTime,
      accumulatedContentLength: this.deltaAccumulator.getAccumulatedContent().length,
      processorStats: this.transcriptProcessor.getDebugInfo(),
      extractorStats: this.transcriptExtractor.getExtractionPathStats()
    };
  }
}
