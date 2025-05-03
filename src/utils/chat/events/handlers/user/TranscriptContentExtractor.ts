
/**
 * Component responsible for extracting transcript content from events
 */
import { TextPropertyFinder } from './TextPropertyFinder';

export class TranscriptContentExtractor {
  private textPropertyFinder: TextPropertyFinder;
  private debugEnabled: boolean;
  private extractionCount: number = 0;
  private lastSuccessfulExtractionPath: string = '';
  private successfulExtractionPaths: Map<string, number> = new Map();
  
  constructor(debugEnabled: boolean = true) {
    this.textPropertyFinder = new TextPropertyFinder();
    this.debugEnabled = debugEnabled;
    console.log('[TranscriptContentExtractor] Initialized with debug mode:', debugEnabled);
  }
  
  /**
   * Extract transcript content from different event types
   */
  extractContent(event: any): { content: string | null, isDelta: boolean } {
    this.extractionCount++;
    const extractionId = this.extractionCount;
    let transcriptContent: string | null = null;
    let isDelta = false;
    let extractionPath = 'unknown';
    
    // First check: try using previous successful extraction paths
    if (this.lastSuccessfulExtractionPath) {
      transcriptContent = this.tryPreviousExtractionPaths(event);
      if (transcriptContent) {
        return { content: transcriptContent, isDelta: event.type === 'response.audio_transcript.delta' };
      }
    }
    
    // Standard extraction paths
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
    else if (event.type === 'response.audio_transcript.done' && event.content) {
      transcriptContent = typeof event.content === 'string' ? event.content : JSON.stringify(event.content);
      extractionPath = 'final-content';
      
      if (this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Content transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
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
    // Additional check for non-standard events that may contain transcript data
    else if (event.transcript) {
      if (typeof event.transcript === 'string') {
        transcriptContent = event.transcript;
        extractionPath = 'event-transcript-string';
      } else if (event.transcript.text) {
        transcriptContent = event.transcript.text;
        extractionPath = 'event-transcript-text';
      } else if (event.transcript.content) {
        transcriptContent = event.transcript.content;
        extractionPath = 'event-transcript-content';
      }
      
      if (transcriptContent && this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Event transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath
        });
      }
    }
    
    // If we still don't have content, try alternative searches
    if (!transcriptContent && event.type === 'response.audio_transcript.delta') {
      // ENHANCED: Check various alternative paths for delta events
      if (event.message?.content) {
        transcriptContent = event.message.content;
        extractionPath = 'message-content';
      } else if (event.text) {
        transcriptContent = event.text;
        extractionPath = 'direct-text';
      } else if (event.data?.text) {
        transcriptContent = event.data.text;
        extractionPath = 'data-text';
      } else if (event.data?.transcript) {
        transcriptContent = typeof event.data.transcript === 'string' 
          ? event.data.transcript 
          : event.data.transcript.text || JSON.stringify(event.data.transcript);
        extractionPath = 'data-transcript';
      } else {
        // Last resort - use deep search if nothing else worked
        const result = this.textPropertyFinder.deepSearchForTextProperties(event);
        if (result.found) {
          transcriptContent = result.content;
          extractionPath = `deep-search-${result.path}`;
        }
      }
      
      if (transcriptContent && this.debugEnabled) {
        console.log(`[TranscriptExtractor] #${extractionId} Alternative path transcript: "${transcriptContent?.substring(0, 50)}${transcriptContent && transcriptContent.length > 50 ? '...' : ''}"`, {
          length: transcriptContent?.length,
          timestamp: new Date().toISOString(),
          path: extractionPath,
          alternative: true
        });
      }
    }
    
    // If content was found, record the successful extraction path
    if (transcriptContent) {
      this.lastSuccessfulExtractionPath = extractionPath;
      const count = this.successfulExtractionPaths.get(extractionPath) || 0;
      this.successfulExtractionPaths.set(extractionPath, count + 1);
    }
    
    // Record extraction metrics
    console.log(`[TranscriptExtractor] #${extractionId} Content extraction result:`, {
      eventType: event.type,
      extractionPath,
      foundContent: !!transcriptContent,
      contentLength: transcriptContent?.length ?? 0,
      isDelta,
      timestamp: new Date().toISOString(),
      successRatio: this.getSuccessRatio()
    });
    
    return { content: transcriptContent, isDelta };
  }
  
  /**
   * Try extracting content using paths that were successful previously
   */
  private tryPreviousExtractionPaths(event: any): string | null {
    // Sort extraction paths by success frequency
    const sortedPaths = [...this.successfulExtractionPaths.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
      
    for (const path of sortedPaths) {
      let content = null;
      
      // Try each successful path based on its identifier
      switch (path) {
        case 'direct-transcript':
          content = typeof event.transcript === 'string' ? event.transcript : null;
          break;
        case 'final-transcript-text':
          content = event.transcript?.text || null;
          break;
        case 'final-delta-text':
          content = event.delta?.text || null;
          break;
        case 'delta-text':
          content = event.delta?.text || null;
          break;
        case 'direct-text':
          content = event.text || null;
          break;
        case 'message-content':
          content = event.message?.content || null;
          break;
        case 'data-text':
          content = event.data?.text || null;
          break;
        case 'data-transcript':
          if (event.data?.transcript) {
            content = typeof event.data.transcript === 'string' 
              ? event.data.transcript 
              : event.data.transcript.text || null;
          }
          break;
        // Add more cases as needed
      }
      
      if (content) {
        console.log(`[TranscriptExtractor] Successfully reused extraction path: ${path} with content length: ${content.length}`);
        return content;
      }
    }
    
    return null;
  }
  
  /**
   * Handle delta events specifically
   */
  private handleDeltaEvent(event: any, extractionId: number): string | null {
    let deltaText = null;
    let propertyPath = 'not-found';
    
    // ENHANCED: First try primary extraction paths
    if (event.delta?.text) {
      deltaText = event.delta.text;
      propertyPath = 'delta.text';
    } else if (event.text) {
      deltaText = event.text;
      propertyPath = 'event.text';
    } else if (typeof event.transcript === 'string') {
      deltaText = event.transcript;
      propertyPath = 'transcript-string';
    } else if (event.transcript?.text) {
      deltaText = event.transcript.text;
      propertyPath = 'transcript.text';
    }
    
    // If primary extraction paths didn't yield results, try more paths
    if (!deltaText) {
      // Try alternative paths
      if (event.content) {
        if (typeof event.content === 'string') {
          deltaText = event.content;
          propertyPath = 'content-string';
        } else if (event.content.text) {
          deltaText = event.content.text;
          propertyPath = 'content.text';
        }
      } else if (event.message?.content) {
        deltaText = event.message.content;
        propertyPath = 'message.content';
      } else if (event.data?.text) {
        deltaText = event.data.text;
        propertyPath = 'data.text';
      } else if (event.data?.content) {
        deltaText = typeof event.data.content === 'string' ? event.data.content : null;
        propertyPath = 'data.content';
      } else if (event.data?.transcript) {
        deltaText = typeof event.data.transcript === 'string' 
          ? event.data.transcript 
          : (event.data.transcript.text || null);
        propertyPath = 'data.transcript';
      }
    }
    
    if (deltaText) {
      console.log(`[TranscriptExtractor] #${extractionId} Found text in ${propertyPath}: "${deltaText}"`, {
        path: propertyPath,
        length: deltaText.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // If no text was found in common places, try to extract from the raw event using improved deep search
    if (!deltaText) {
      console.warn(`[TranscriptExtractor] #${extractionId} ⚠️ No text found in expected delta properties, performing deep search`);
      
      // Use the enhanced deep search to find any text property
      const result = this.textPropertyFinder.deepSearchForTextProperties(event);
      if (result.found) {
        deltaText = result.content;
        propertyPath = result.path;
        console.log(`[TranscriptExtractor] #${extractionId} Found text through deep search at path '${result.path}': "${deltaText}"`, {
          path: propertyPath,
          length: deltaText.length,
          timestamp: new Date().toISOString()
        });
      } else {
        // Last resort - log the event structure for debugging
        console.warn(`[TranscriptExtractor] #${extractionId} ⚠️ No text content found anywhere in delta event`);
        if (this.debugEnabled) {
          console.log(`[TranscriptExtractor] #${extractionId} Delta event structure:`, JSON.stringify(event, null, 2).substring(0, 1000) + (JSON.stringify(event).length > 1000 ? '...' : ''));
        }
      }
    }
    
    return deltaText;
  }
  
  /**
   * Get success ratio statistics
   */
  private getSuccessRatio(): { total: number, successful: number, ratio: number } {
    const successful = Array.from(this.successfulExtractionPaths.values()).reduce((sum, count) => sum + count, 0);
    const ratio = this.extractionCount > 0 ? successful / this.extractionCount : 0;
    
    return {
      total: this.extractionCount,
      successful,
      ratio: parseFloat(ratio.toFixed(2))
    };
  }
  
  /**
   * Get statistics about which extraction paths have been successful
   */
  getExtractionPathStats(): { path: string, count: number, percentage: number }[] {
    const total = Array.from(this.successfulExtractionPaths.values()).reduce((sum, count) => sum + count, 0);
    
    return Array.from(this.successfulExtractionPaths.entries())
      .map(([path, count]) => ({
        path,
        count,
        percentage: total > 0 ? parseFloat((count / total * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
}
