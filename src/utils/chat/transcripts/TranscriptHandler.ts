
import { MessageQueue } from '../messageQueue';
import { toast } from 'sonner';

/**
 * Handles capturing and processing user transcripts
 */
export class TranscriptHandler {
  private userTranscript: string = '';
  private lastTranscriptTime: number = 0;
  private userSpeechDetected: boolean = false;
  private processedTranscripts: Set<string> = new Set();
  
  constructor(private messageQueue: MessageQueue) {}

  /**
   * Process transcript events and accumulate transcript text
   */
  handleTranscriptDelta(deltaText: string): void {
    if (deltaText) {
      this.userTranscript += deltaText;
      console.log(`Accumulating user transcript (${this.userTranscript.length} chars): "${this.userTranscript}"`);
      this.lastTranscriptTime = Date.now();
    }
  }
  
  /**
   * Process direct transcript events with high priority
   */
  handleDirectTranscript(transcript: string): void {
    if (transcript && transcript.trim()) {
      // Check for duplicates
      if (this.processedTranscripts.has(transcript)) {
        console.log("Duplicate transcript detected, skipping:", transcript);
        return;
      }
      
      console.log("Saving direct user transcript:", transcript);
      this.messageQueue.queueMessage('user', transcript, true); // High priority save
      this.processedTranscripts.add(transcript);
      
      toast.info("User message captured", {
        description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        duration: 2000,
      });
    }
  }
  
  /**
   * Process final transcript completions
   */
  handleFinalTranscript(text: string | undefined): void {
    // Get the final transcript and save it
    const content = text;
    
    if (content && content.trim()) {
      // Check for duplicates
      if (this.processedTranscripts.has(content)) {
        console.log("Duplicate final transcript detected, skipping:", content);
        return;
      }
      
      console.log("Final user transcript received:", content);
      this.messageQueue.queueMessage('user', content, true); // High priority save
      this.processedTranscripts.add(content);
      
      // Reset transcript accumulator
      this.userTranscript = '';
      this.userSpeechDetected = false;
      
      toast.success("User message saved", {
        description: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        duration: 2000,
      });
    } else if (this.userTranscript && this.userTranscript.trim()) {
      // Fallback to accumulated transcript if final is missing
      console.log("Using accumulated user transcript:", this.userTranscript);
      
      // Check for duplicates
      if (!this.processedTranscripts.has(this.userTranscript)) {
        this.messageQueue.queueMessage('user', this.userTranscript, true); // High priority save
        this.processedTranscripts.add(this.userTranscript);
        
        toast.success("User message saved (accumulated)", {
          description: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? "..." : ""),
          duration: 2000,
        });
      }
      
      this.userTranscript = '';
      this.userSpeechDetected = false;
    } else {
      console.log("Empty user transcript, not saving");
      this.userSpeechDetected = false;
    }
  }
  
  /**
   * Handle speech started events
   */
  handleSpeechStarted(): void {
    this.userSpeechDetected = true;
    console.log("User speech started - preparing to capture transcript");
  }
  
  /**
   * Handle speech stopped events
   */
  handleSpeechStopped(): void {
    if (this.userSpeechDetected) {
      console.log("User speech stopped - checking for transcript");
      
      // If we have transcript, save it after a small delay to allow for final transcripts
      if (this.userTranscript && this.userTranscript.trim()) {
        console.log(`User speech stopped with transcript: "${this.userTranscript}"`);
        setTimeout(() => {
          if (this.userTranscript && this.userTranscript.trim()) {
            console.log("Saving speech-stopped transcript:", this.userTranscript);
            
            // Check for duplicates
            if (!this.processedTranscripts.has(this.userTranscript)) {
              this.messageQueue.queueMessage('user', this.userTranscript, true); // High priority
              this.processedTranscripts.add(this.userTranscript);
              
              toast.success("User message saved", {
                description: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? "..." : ""),
                duration: 2000,
              });
              
              this.userTranscript = '';
            }
            
            this.userSpeechDetected = false;
          }
        }, 300);
      }
    }
  }
  
  /**
   * Handle committed audio buffer events
   */
  handleAudioBufferCommitted(): void {
    console.log("Audio buffer committed, checking if we need to save partial transcript");
    
    // If user was speaking and we have transcript, consider saving it
    if (this.userSpeechDetected && 
        this.userTranscript && 
        this.userTranscript.trim() &&
        Date.now() - this.lastTranscriptTime > 1500) {
      console.log("Saving transcript from committed buffer:", this.userTranscript);
      
      // Check for duplicates
      if (!this.processedTranscripts.has(this.userTranscript)) {
        this.messageQueue.queueMessage('user', this.userTranscript, true);
        this.processedTranscripts.add(this.userTranscript);
        
        toast.info("User message saved (buffer)", {
          description: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? "..." : ""),
          duration: 2000,
        });
        
        this.userTranscript = '';
      }
    }
  }
  
  /**
   * For cleanup - save any pending transcript
   */
  flushPendingTranscript(): void {
    if (this.userTranscript && this.userTranscript.trim()) {
      console.log("Saving partial user transcript during disconnect:", this.userTranscript);
      
      // Check for duplicates
      if (!this.processedTranscripts.has(this.userTranscript)) {
        this.messageQueue.queueMessage('user', this.userTranscript, true); // High priority
        this.processedTranscripts.add(this.userTranscript);
        
        toast.success("Final user message saved during disconnect", {
          description: this.userTranscript.substring(0, 50) + (this.userTranscript.length > 50 ? "..." : ""),
          duration: 2000,
        });
      }
    }
  }
  
  /**
   * Get the current accumulated transcript
   */
  getTranscript(): string {
    return this.userTranscript;
  }
  
  /**
   * Clear the current transcript
   */
  clearTranscript(): void {
    this.userTranscript = '';
  }
  
  /**
   * Get user speech detected state
   */
  isUserSpeechDetected(): boolean {
    return this.userSpeechDetected;
  }
}
