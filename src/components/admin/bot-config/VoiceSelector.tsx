
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
  return (
    <div className="space-y-2">
      <label className="block font-medium text-gray-700">
        Bot Voice
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="alloy">Alloy - Neutral</SelectItem>
          <SelectItem value="echo">Echo - Male</SelectItem>
          <SelectItem value="sage">Sage - Male</SelectItem>
          <SelectItem value="ash">Ash - Male</SelectItem>
          <SelectItem value="coral">Coral - Female</SelectItem>
          <SelectItem value="shimmer">Shimmer - Female</SelectItem>
          <SelectItem value="verse">Verse - Female</SelectItem>
          <SelectItem value="ballad">Ballad - Male</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-gray-500">
        Choose the voice personality for the bot
      </p>
    </div>
  );
};

export default VoiceSelector;
