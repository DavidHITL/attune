
/**
 * Component responsible for extracting transcript content from events
 */
import { TextPropertyFinder } from './TextPropertyFinder';

export class TranscriptContentExtractor {
  private textPropertyFinder: TextPropertyFinder;
  private debugEnabled: boolean;
  private extractionCount: number = 0;
  private uiStreamBuffer: string = '';
  
  constructor(debugEnabled: boolean = true) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.debugEnabled = debugEnabled;
    console.log('[TranscriptContentExtractor] Initialized with debug mode:', debugEnabled);
  }
  
  /**
   * Extract transcript content from different event types
   */
  extractContent(event: any): string | null {
    this.extractionCount++;
    const extractionId = this.extractionCount;
    let transcriptContent: string | null = null;
    let isDelta = false;
    let extractionPath = 'unknown';
    
    // Extract content based on event type
    if (event.type === 'transcript' && typeof event.transcript === 'string') {
      transcriptContent = event.transcript;
      extractionPath = 'direct-transcript';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Direct transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    } 
    else if (event.type === 'response.audio_transcript.done' && event.transcript?.text) {
      transcriptContent = event.transcript.text;
      extractionPath = 'final-transcript-text';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Final transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    else if (event.type === 'response.audio_transcript.done' && event.delta?.text) {
      transcriptContent = event.delta.text;
      extractionPath = 'final-delta-text';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Final delta transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    // New handler for conversation.item.input_audio_transcription.completed events
    else if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
      transcriptContent = event.transcript;
      extractionPath = 'input-audio-transcription-completed';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Input audio transcription completed: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    else if (event.type === 'response.audio_transcript.delta') {
      isDelta = true;
      transcriptContent = this.handleDeltaEvent(event, extractionId);
      extractionPath = 'delta';
    }
    
    // Record extraction metrics
    console.log(`[TranscriptExtractor] #${extractionId} Content extraction result:`, {
      eventType: event.type,
      extractionPath,
      foundContent: !!transcriptContent,
      contentLength: transcriptContent?.length ?? 0,
      isDelta,
      timestamp: new Date().toISOString()
    });
    
    return transcriptContent;
  }
  
  /**
   * Handle delta events specifically
   */
  private handleDeltaEvent(event: any, extractionId: number): string | null {
    // Updated logic for delta events to handle streaming for UI
    const snippet = event.delta?.content || event.data?.content;
    if (!snippet) return null; // ignore empty control packets
    
    this.uiStreamBuffer += snippet;
    
    console.log(`[TranscriptExtractor] #${extractionId} Delta snippet appended to UI stream buffer: "${snippet}"`, {
      bufferLength: this.uiStreamBuffer.length,
      timestamp: new Date().toISOString()
    });
    
    return snippet;
  }
  
  /**
   * Get the current UI stream buffer content
   */
  getUIStreamBuffer(): string {
    return this.uiStreamBuffer;
  }
  
  /**
   * Clear the UI stream buffer
   */
  clearUIStreamBuffer(): void {
    this.uiStreamBuffer = '';
  }
  
  /**
   * Append to the UI stream buffer
   */
  appendToUIStreamBuffer(content: string): void {
    this.uiStreamBuffer += content;
  }
}
