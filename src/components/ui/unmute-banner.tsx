
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from './button';

interface UnmuteBannerProps {
  onActionClick: () => void;
}

/**
 * A banner that displays when the system detects audio might be muted
 */
export const UnmuteBanner: React.FC<UnmuteBannerProps> = ({ 
  onActionClick 
}) => {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-0 right-0 mx-auto w-[90%] max-w-md bg-blue-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between z-50 animate-fade-in">
      <div className="flex items-center space-x-3">
        <VolumeX className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">
          Can't hear the assistant? Your device audio might be muted.
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-blue-600"
        >
          Dismiss
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onActionClick();
            setDismissed(true);
          }}
          className="bg-white text-blue-500 hover:bg-white/90"
        >
          Fix Audio
        </Button>
      </div>
    </div>
  );
};

/**
 * Hook to check if audio is likely muted system-wide
 */
export const useAudioMuteDetection = () => {
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
  
  useEffect(() => {
    // Try to create a test AudioContext to check if audio is working
    const detectAudioIssues = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // If context is suspended, likely audio permissions or system audio issues
        if (audioContext.state === 'suspended') {
          console.log('Audio context suspended, might be system audio issues');
          setShowUnmutePrompt(true);
        } else {
          // Create a short silent oscillator to test audio system
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.001; // Nearly silent
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            audioContext.close();
          }, 100);
        }
      } catch (e) {
        console.log('Error during audio detection:', e);
        setShowUnmutePrompt(true);
      }
    };
    
    // Run the detection after a delay to allow time for audio setup
    const timer = setTimeout(() => {
      detectAudioIssues();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const fixAudioIssues = () => {
    try {
      // Try to create and resume an audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error('Error resuming audio context:', e));
      }
      
      // Play a silent sound to wake up audio system
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.1; // Audible but quiet
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        setShowUnmutePrompt(false);
      }, 200);
    } catch (e) {
      console.error('Error fixing audio:', e);
    }
  };
  
  return {
    showUnmutePrompt,
    fixAudioIssues
  };
};
