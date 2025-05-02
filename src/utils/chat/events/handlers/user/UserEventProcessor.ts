
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
  
  constructor(private messageQueue: MessageQueue, debugEnabled: boolean = true) {
    this.deltaAccumulator = new DeltaAccumulator();
    this.transcriptExtractor = new TranscriptContentExtractor(debugEnabled);
    this.transcriptProcessor = new TranscriptProcessor(messageQueue);
    this.debugEnabled = debugEnabled;
    
    console.log('[UserEventProcessor] Initialized with debug mode:', debugEnabled);
  }
  
  processEvent(event: any): void {
    this.eventCounter++;
    const eventId = this.eventCounter;
    
    if (this.debugEnabled) {
      console.log(`[UserEventProcessor] #${eventId} Processing event type: ${event.type}`, {
        timestamp: new Date().toISOString(),
        eventType: event.type,
        eventId
      });
    }
    
    // Verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[UserEventProcessor] #${eventId} Event ${event.type} is not a user event, skipping`);
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole: 'user' | 'assistant' = 'user';
    
    // Extract content from the event
    const { content: transcriptContent, isDelta } = this.transcriptExtractor.extractContent(event);
    
    // For delta events, accumulate content
    if (isDelta && transcriptContent) {
      this.deltaAccumulator.accumulateDelta(transcriptContent);
      console.log(`[UserEventProcessor] #${eventId} Accumulating delta: "${transcriptContent}" (total: ${this.deltaAccumulator.getAccumulatedContent().length} chars)`, {
        deltaLength: transcriptContent.length,
        totalAccumulated: this.deltaAccumulator.getAccumulatedContent().length,
        timestamp: new Date().toISOString(),
        eventId
      });
      
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
      
      return;
    }
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[UserEventProcessor] #${eventId} Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // Skip duplicate transcripts
    if (this.transcriptProcessor.isDuplicate(transcriptContent)) {
      console.log(`[UserEventProcessor] #${eventId} Duplicate transcript, skipping: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`, {
        contentLength: transcriptContent.length,
        timestamp: new Date().toISOString(),
        eventId
      });
      return;
    }
    
    // Process and save the transcript
    console.log(`[UserEventProcessor] #${eventId} Processing direct transcript: "${transcriptContent.substring(0, 50)}${transcriptContent.length > 50 ? '...' : ''}"`, {
      contentLength: transcriptContent.length,
      timestamp: new Date().toISOString(),
      eventId
    });
    this.transcriptProcessor.saveUserMessage(transcriptContent, forcedRole);
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
  }
}
