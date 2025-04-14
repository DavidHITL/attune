
import { toast } from 'sonner';

/**
 * Handles notifications about transcript processing
 */
export class TranscriptNotifier {
  /**
   * Show toast notification for transcript capture
   */
  notifyTranscriptCaptured(transcript: string): void {
    toast.info("User message captured", {
      description: this.formatTranscriptPreview(transcript),
      duration: 2000,
    });
  }
  
  /**
   * Show toast notification for final transcript saved
   */
  notifyTranscriptSaved(transcript: string, source: string = ''): void {
    const sourceText = source ? ` (${source})` : '';
    toast.success(`User message saved${sourceText}`, {
      description: this.formatTranscriptPreview(transcript),
      duration: 2000,
    });
  }
  
  /**
   * Format transcript for display in notifications
   */
  private formatTranscriptPreview(transcript: string): string {
    return transcript.substring(0, 50) + (transcript.length > 50 ? "..." : "");
  }
}
