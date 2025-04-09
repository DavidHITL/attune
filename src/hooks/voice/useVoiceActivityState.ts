
import { useState, useCallback } from 'react';
import { VoiceActivityState } from '@/components/VoiceActivityIndicator';

/**
 * Hook for managing voice activity state
 */
export const useVoiceActivityState = () => {
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>(VoiceActivityState.Idle);

  const handleMessageEvent = useCallback((event: any) => {
    if (event.type === 'response.audio.delta' || event.type === 'response.audio_transcript.delta') {
      // Audio is playing or transcript is being received - AI is speaking
      setVoiceActivityState(VoiceActivityState.Output);
    } else if (event.type === 'response.audio.done' || event.type === 'response.audio_transcript.done') {
      // Audio finished playing
      setVoiceActivityState(VoiceActivityState.Idle);
    } else if (event.type === 'input_audio_activity_started') {
      // Microphone input is active
      setVoiceActivityState(VoiceActivityState.Input);
    } else if (event.type === 'input_audio_activity_stopped') {
      // Microphone input has stopped
      setVoiceActivityState(VoiceActivityState.Idle);
    } else if (event.type === 'response.created') {
      // AI has started generating a response
      setVoiceActivityState(VoiceActivityState.Output);
    } else if (event.type === 'response.done') {
      // AI has finished generating a response
      setVoiceActivityState(VoiceActivityState.Idle);
    }
  }, []);

  return {
    voiceActivityState,
    setVoiceActivityState,
    handleMessageEvent
  };
};
