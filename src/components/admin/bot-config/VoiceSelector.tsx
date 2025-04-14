
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';

interface VoiceSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ value, onValueChange }) => {
  // Adding console log to track voice selection changes
  const handleVoiceChange = (newVoice: string) => {
    console.log("Voice selected:", newVoice);
    onValueChange(newVoice);
  };
  
  return (
    <div className="space-y-2">
      <label className="block font-medium text-gray-700">
        Bot Voice
      </label>
      <Select value={value} onValueChange={handleVoiceChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="alloy">Alloy - Neutral</SelectItem>
          <SelectItem value="echo">Echo - Male (Deep)</SelectItem>
          <SelectItem value="sage">Sage - Male (Gentle)</SelectItem>
          <SelectItem value="ash">Ash - Male (Warm)</SelectItem>
          <SelectItem value="coral">Coral - Female (Warm)</SelectItem>
          <SelectItem value="shimmer">Shimmer - Female (Clear)</SelectItem>
          <SelectItem value="verse">Verse - Female (Expressive)</SelectItem>
          <SelectItem value="ballad">Ballad - Male (Rich)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-gray-500">
        Choose the voice personality for the bot
      </p>
    </div>
  );
};

export default VoiceSelector;
