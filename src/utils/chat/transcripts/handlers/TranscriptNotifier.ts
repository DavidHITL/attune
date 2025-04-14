
import { toast } from 'sonner';
import { TranscriptSource } from '../../user-messages/types';

/**
 * Configuration options for transcript notifications
 */
export interface NotificationOptions {
  duration?: number;
  showPreview?: boolean;
  previewLength?: number;
  variant?: 'default' | 'success' | 'info' | 'warning' | 'error';
}

/**
 * Default notification settings
 */
const defaultOptions: NotificationOptions = {
  duration: 2000,
  showPreview: true,
  previewLength: 50,
  variant: 'default',
};

/**
 * Handles notifications about transcript processing
 */
export class TranscriptNotifier {
  /**
   * Show toast notification for transcript capture
   */
  notifyTranscriptCaptured(transcript: string, options?: NotificationOptions): void {
    const mergedOptions = { ...defaultOptions, ...options };
    
    toast.info("User message captured", {
      description: mergedOptions.showPreview ? this.formatTranscriptPreview(transcript, mergedOptions.previewLength) : undefined,
      duration: mergedOptions.duration,
    });
  }
  
  /**
   * Show toast notification for final transcript saved
   */
  notifyTranscriptSaved(transcript: string, source: string = '', options?: NotificationOptions): void {
    const mergedOptions = { ...defaultOptions, ...options, variant: 'success' as const };
    const sourceText = source ? ` (${source})` : '';
    
    toast.success(`User message saved${sourceText}`, {
      description: mergedOptions.showPreview ? this.formatTranscriptPreview(transcript, mergedOptions.previewLength) : undefined,
      duration: mergedOptions.duration,
    });
  }
  
  /**
   * Show toast notification for transcript processing error
   */
  notifyTranscriptError(error: string, options?: NotificationOptions): void {
    const mergedOptions = { ...defaultOptions, ...options, variant: 'error' as const };
    
    toast.error("Transcript processing error", {
      description: error,
      duration: mergedOptions.duration || 3000, // Longer duration for errors
    });
  }
  
  /**
   * Show toast notification for partial/accumulating transcript
   */
  notifyTranscriptAccumulating(transcript: string, options?: NotificationOptions): void {
    const mergedOptions = { ...defaultOptions, ...options, variant: 'info' as const };
    
    toast.info("Processing speech...", {
      description: mergedOptions.showPreview ? this.formatTranscriptPreview(transcript, mergedOptions.previewLength) : undefined,
      duration: mergedOptions.duration,
    });
  }
  
  /**
   * Show notification based on transcript source
   */
  notifyTranscriptBySource(transcript: string, source: TranscriptSource, options?: NotificationOptions): void {
    switch (source) {
      case 'direct':
        this.notifyTranscriptCaptured(transcript, options);
        break;
      case 'accumulated':
        this.notifyTranscriptAccumulating(transcript, options);
        break;
      case 'buffer':
        this.notifyTranscriptSaved(transcript, 'buffer', options);
        break;
      case 'disconnect':
        this.notifyTranscriptSaved(transcript, 'on disconnect', options);
        break;
      default:
        this.notifyTranscriptSaved(transcript, '', options);
    }
  }
  
  /**
   * Format transcript for display in notifications with customizable length
   */
  private formatTranscriptPreview(transcript: string, previewLength: number = 50): string {
    if (!transcript) return '';
    
    // Clean the transcript text
    const cleanText = transcript.trim();
    
    // Add ellipsis if text is longer than previewLength
    return cleanText.length > previewLength 
      ? `${cleanText.substring(0, previewLength)}...`
      : cleanText;
  }
  
  /**
   * Format user message timestamp for display
   */
  formatTimestamp(date?: Date | string): string {
    const messageDate = date ? new Date(date) : new Date();
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
