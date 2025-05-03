
import { useCallback } from 'react';
import { useConversationValidator } from './useConversationValidator';
import { useTranscriptNotifications } from './useTranscriptNotifications';
import { Message } from '@/utils/types';
import { toast } from 'sonner';

export const useTranscriptSaver = () => {
  const { validateConversationContext } = useConversationValidator();
  const { notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError } = useTranscriptNotifications();

  const saveTranscript = useCallback(async (
    transcript: string, 
    role: 'user' | 'assistant',
    saveMessage: (msg: { role: 'user' | 'assistant'; content: string }) => Promise<Message | undefined>
  ) => {
    // CRITICAL FIX #1: Force early validation at the entry point
    if (role !== 'user' && role !== 'assistant') {
      console.error(`[TranscriptSaver] FATAL ERROR: Invalid role "${role}"`);
      throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
    }

    // Double-check role format before proceeding
    console.log(`[TranscriptSaver] ⚠️ ROLE CHECKPOINT: role="${role}" (type=${typeof role})`);

    // Add validation of conversation context
    if (!validateConversationContext()) {
      console.error("❌ Cannot save transcript: Invalid conversation context");
      return;
    }

    // Validate transcript content
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }
    
    // CRITICAL DEBUG - Log at multiple points to trace the role
    console.log(`🔍 [TranscriptSaver] Role validation passed - role="${role}"`);
    console.log(`💾 [TranscriptSaver] TRANSCRIPT TO SAVE (ROLE=${role.toUpperCase()}):`, transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''));
    
    notifyTranscriptReceived(transcript);
    
    try {
      // Create a clean, fresh object with explicitly assigned role property
      // This avoids any reference issues or property inheritance problems
      const messageObj = {
        role: role, // Assign directly from the validated parameter
        content: transcript
      };
      
      console.log(`🔒 [TranscriptSaver] FINAL PRE-SAVE ROLE CHECK: role="${messageObj.role}"`);
      
      // Call saveMessage with the fresh object
      const savedMsg = await saveMessage(messageObj);
      
      if (savedMsg) {
        // Verify the saved message has the correct role
        console.log(`✅ [TranscriptSaver] Message saved successfully with ID=${savedMsg.id}, FINAL ROLE="${savedMsg.role}"`);
        
        if (savedMsg.role !== role) {
          console.error(`❌ [TranscriptSaver] ROLE MISMATCH: Expected="${role}", Actual="${savedMsg.role}"`);
        }
        
        notifyTranscriptSaved(savedMsg.id);
        
        toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        });
      }
    } catch (error) {
      console.error(`❌ [TranscriptSaver] Failed to save ${role} transcript:`, error);
      notifyTranscriptError(error);
      
      toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
        description: "Please try again",
      });
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
