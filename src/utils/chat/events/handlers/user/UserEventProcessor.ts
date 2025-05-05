
/**
 * Component responsible for processing user events
 */
import { MessageQueue } from '../../../messageQueue';
import { TextPropertyFinder } from './TextPropertyFinder';
import { TranscriptProcessor } from './TranscriptProcessor';
import { TranscriptContentExtractor } from './TranscriptContentExtractor';
import { UserEventDebugger } from './UserEventDebugger';
import { EventTypeRegistry } from '../../EventTypeRegistry';
import { getMessageQueue } from '../../../messageQueue/QueueProvider';
import { toast } from 'sonner';

export class UserEventProcessor {
  private textPropertyFinder: TextPropertyFinder;
  private transcriptProcessor: TranscriptProcessor;
  private transcriptContentExtractor: TranscriptContentExtractor;
  private eventDebugger: UserEventDebugger;
  private processedCount: number = 0;
  private processedTranscripts = new Set<string>();
  
  constructor(private messageQueue: MessageQueue) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.transcriptProcessor = new TranscriptProcessor(messageQueue);
    this.transcriptContentExtractor = new TranscriptContentExtractor();
    this.eventDebugger = UserEventDebugger.getInstance();
    
    console.log('[UserEventProcessor] Initialized');
    
    // Clear processed transcripts every 10 minutes to avoid memory buildup
    setInterval(() => {
      this.processedTranscripts.clear();
    }, 600000);
  }
  
  /**
   * Process user events and extract transcript content
   */
  processEvent(event: any): void {
    this.processedCount++;
    const processId = this.processedCount;
    
    // CRITICAL FIX: Validate the event has explicit role or get it from registry
    let role = event.explicitRole;
    
    // If no explicit role, try to get from registry, but this shouldn't happen
    // since UserEventHandler should have set explicitRole='user'
    if (!role) {
      role = EventTypeRegistry.getRoleForEvent(event.type);
      console.warn(`[UserEventProcessor] #${processId} Missing explicitRole, had to determine from registry: ${role}`);
    }
    
    // Log incoming event for debugging
    console.log(`[UserEventProcessor] #${processId} Processing event: ${event.type}, role: ${role || 'unknown'}`);
    
    // CRITICAL FIX: Only process if this is a user event
    if (role !== 'user') {
      console.error(`[UserEventProcessor] #${processId} CRITICAL ERROR: Received non-user event in user processor: ${event.type}, role: ${role}`);
      console.error(`[UserEventProcessor] #${processId} This indicates a serious routing issue that needs to be fixed`);
      return; // Absolutely critical to stop processing if role is wrong
    }
    
    try {
      // Special handling for conversation.item.input_audio_transcription.completed events
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        console.log(`[UserEventProcessor] #${processId} Processing input audio transcription completed event`);
        
        // Extract the transcript from the event
        const transcript = event.transcript;
        
        if (transcript && typeof transcript === 'string' && transcript.trim()) {
          // Create fingerprint for deduplication
          const transcriptFingerprint = `${event.type}:${transcript.substring(0, 50)}`;
          
          // Skip if we've already processed this exact transcript
          if (this.processedTranscripts.has(transcriptFingerprint)) {
            console.log(`[UserEventProcessor] #${processId} Skipping duplicate transcript`);
            return;
          }
          
          // Mark as processed
          this.processedTranscripts.add(transcriptFingerprint);
          
          console.log(`[UserEventProcessor] #${processId} Found transcript in input_audio_transcription: "${transcript.substring(0, 30)}${transcript.length > 30 ? '...' : ''}"`);
          
          // Try using the global message queue first for consistency 
          const globalMessageQueue = getMessageQueue();
          if (globalMessageQueue) {
            console.log(`[UserEventProcessor] #${processId} Using global message queue for transcript`);
            globalMessageQueue.queueMessage('user', transcript, true);
            
            // Show toast notification
            toast.success("Speech transcribed", {
              description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
              duration: 3000
            });
          } else {
            // Fall back to local message queue
            console.log(`[UserEventProcessor] #${processId} Using local message queue for transcript`);
            this.transcriptProcessor.saveMessage(transcript, 'user', true);
          }
        } else {
          console.log(`[UserEventProcessor] #${processId} No valid transcript found in input_audio_transcription event`);
        }
        return;
      }
      
      // Debug the event structure before extraction
      this.eventDebugger.analyzeEvent(event);
      
      // Extract content from the event using content extractor
      const content = this.transcriptContentExtractor.extractContent(event);
      
      // If no content found, try deeper search
      if (!content) {
        console.log(`[UserEventProcessor] #${processId} No content found in initial extraction, attempting deep search...`);
        const deepText = this.textPropertyFinder.findTextProperty(event);
        
        if (deepText) {
          console.log(`[UserEventProcessor] #${processId} Deep search found text content: "${deepText.substring(0, 30)}${deepText.length > 30 ? '...' : ''}"`);
          // CRITICAL FIX: Always use 'user' role for user event processor
          this.transcriptProcessor.saveMessage(deepText, 'user', true);
        } else {
          console.log(`[UserEventProcessor] #${processId} No text content found in event:`, 
            event.type, event.explicitRole || '(no explicit role)');
        }
      } else {
        // Process the extracted content with the correct role
        console.log(`[UserEventProcessor] #${processId} Extracted content: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
        // CRITICAL FIX: Always use 'user' role for user event processor
        this.transcriptProcessor.saveMessage(content, 'user', true);
      }
    } catch (error) {
      console.error(`[UserEventProcessor] #${processId} Error processing event:`, error);
    }
  }
  
  /**
   * Flush accumulated transcript before disconnection
   */
  flushAccumulatedTranscript(): void {
    console.log('[UserEventProcessor] Flushing any accumulated transcript');
    // Implementation specific to your transcript accumulation logic
  }
}
