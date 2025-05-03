
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
    // CRITICAL FIX: Add explicit validation at the start
    if (!validateConversationContext()) {
      console.error("❌ Cannot save transcript: Invalid conversation context");
      return;
    }

    // CRITICAL FIX: Validate transcript content
    if (!transcript || transcript.trim() === '') {
      console.warn("⚠️ Empty transcript received, not saving");
      return;
    }
    
    // CRITICAL FIX: Validate and enforce role correctness
    if (role !== 'user' && role !== 'assistant') {
      console.error(`❌ Invalid role provided: ${role}. Must be 'user' or 'assistant'`);
      role = 'user'; // Default to user as fallback
    }

    // SUPER CRITICAL DEBUG - Log the exact role at the point of saving
    console.log(`🔍 TRANSCRIPT ROLE CHECK: Saving message with role="${role}" at ${new Date().toISOString()}`);
    console.log(`💾 FULL TRANSCRIPT TO SAVE (Role: ${role}):`, transcript);
    
    notifyTranscriptReceived(transcript);
    
    try {
      console.log(`💾 Saving ${role} transcript:`, {
        role,
        preview: transcript.substring(0, 30),
        length: transcript.length,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL FIX: Add retry logic for transcript saving
      let attempt = 1;
      const maxAttempts = 3;
      let savedMsg: Message | undefined;
      
      while (attempt <= maxAttempts && !savedMsg?.id) {
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt} for saving transcript`);
        }
        
        try {
          // CRITICAL FIX: Ensure role is NEVER overwritten with hardcoded value
          console.log(`🔒 ABOUT TO CALL saveMessage with role="${role}"`);
          savedMsg = await saveMessage({
            role: role, 
            content: transcript
          });
          
          // Verify the role was sent correctly
          console.log(`✅ saveMessage call completed with role="${role}"`);
          
          if (savedMsg && savedMsg.id) {
            console.log(`✅ Successfully saved ${role} transcript with ID:`, savedMsg.id);
            // Verify final saved role
            console.log(`✅ Final saved message role: ${savedMsg.role}`);
            break;
          } else {
            console.warn(`⚠️ Save attempt ${attempt} returned no valid message ID`);
            attempt++;
          }
        } catch (innerError) {
          console.error(`❌ Attempt ${attempt} failed:`, innerError);
          attempt++;
          if (attempt <= maxAttempts) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (savedMsg && savedMsg.id) {
        notifyTranscriptSaved(savedMsg?.id);
        toast.success(`${role === 'user' ? 'Message' : 'Response'} saved`, {
          description: transcript.substring(0, 50) + (transcript.length > 50 ? "..." : ""),
        });
      } else {
        throw new Error(`Failed to save transcript after ${maxAttempts} attempts`);
      }
    } catch (error) {
      console.error(`❌ Failed to save ${role} transcript:`, error);
      notifyTranscriptError(error);
      toast.error(`Failed to save ${role === 'user' ? 'message' : 'response'}`, {
        description: "Please try again",
      });
    }
  }, [validateConversationContext, notifyTranscriptReceived, notifyTranscriptSaved, notifyTranscriptError]);

  return { saveTranscript };
};
