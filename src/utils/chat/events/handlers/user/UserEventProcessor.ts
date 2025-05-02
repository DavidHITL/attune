
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
  
  constructor(private messageQueue: MessageQueue, debugEnabled: boolean = true) {
    this.deltaAccumulator = new DeltaAccumulator();
    this.transcriptExtractor = new TranscriptContentExtractor(debugEnabled);
    this.transcriptProcessor = new TranscriptProcessor(messageQueue);
    this.debugEnabled = debugEnabled;
    
    console.log('[UserEventProcessor] Initialized');
  }
  
  processEvent(event: any): void {
    if (this.debugEnabled) {
      console.log(`[UserEventProcessor] Processing event type: ${event.type}`);
    }
    
    // Verify this is actually a user event
    if (!EventTypeRegistry.isUserEvent(event.type)) {
      console.log(`[UserEventProcessor] Event ${event.type} is not a user event, skipping`);
      return;
    }
    
    // Always force the correct role for any messages saved here
    const forcedRole: 'user' | 'assistant' = 'user';
    
    // Extract content from the event
    const { content: transcriptContent, isDelta } = this.transcriptExtractor.extractContent(event);
    
    // For delta events, accumulate content
    if (isDelta && transcriptContent) {
      this.deltaAccumulator.accumulateDelta(transcriptContent);
      console.log(`[UserEventProcessor] Accumulating delta: "${transcriptContent}" (total: ${this.deltaAccumulator.getAccumulatedContent().length} chars)`);
      
      // Check if we should process accumulated deltas
      if (this.deltaAccumulator.shouldProcessAccumulated() || 
          this.deltaAccumulator.hasSubstantialContent()) {
        
        const accumulatedContent = this.deltaAccumulator.getAccumulatedContent();
        this.deltaAccumulator.markProcessed();
        
        console.log(`[UserEventProcessor] Processing accumulated deltas: "${accumulatedContent.substring(0, 50)}..."`);
        this.transcriptProcessor.saveUserMessage(accumulatedContent, forcedRole);
      }
      
      return;
    }
    
    // Skip empty transcripts
    if (!transcriptContent || transcriptContent.trim() === '') {
      console.log(`[UserEventProcessor] Empty transcript in ${event.type}, skipping`);
      return;
    }
    
    // Skip duplicate transcripts
    if (this.transcriptProcessor.isDuplicate(transcriptContent)) {
      console.log(`[UserEventProcessor] Duplicate transcript, skipping`);
      return;
    }
    
    // Process and save the transcript
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
      console.log(`[UserEventProcessor] Forcing flush of accumulated transcript: "${accumulatedContent.substring(0, 50)}${accumulatedContent.length > 50 ? '...' : ''}"`);
      
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
