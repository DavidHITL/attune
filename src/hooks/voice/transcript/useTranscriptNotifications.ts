
import { toast } from 'sonner';

export const useTranscriptNotifications = () => {
  const notifyTranscriptReceived = (transcript: string) => {
    toast.info("User speech detected", {
      description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
      duration: 2000,
    });
  };

  const notifyTranscriptSaved = (messageId: string | undefined) => {
    console.log("✅ Successfully saved user transcript:", {
      messageId,
      timestamp: new Date().toISOString()
    });
  };

  const notifyTranscriptError = (error: any) => {
    console.error("❌ Failed to save user transcript:", {
      error,
      timestamp: new Date().toISOString()
    });
  };

  return {
    notifyTranscriptReceived,
    notifyTranscriptSaved,
    notifyTranscriptError
  };
};
