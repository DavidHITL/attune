// This file is now just a re-export of the main hook
// We keep this for backward compatibility with existing code
import { useAudioPlayer } from './audio/useAudioPlayer';

export const useAudioControl = useAudioPlayer;
