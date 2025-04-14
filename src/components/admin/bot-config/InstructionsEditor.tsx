
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface InstructionsEditorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  lastUpdated: string | null;
}

const InstructionsEditor: React.FC<InstructionsEditorProps> = ({ 
  value, 
  onChange, 
  lastUpdated 
}) => {
  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "Never";
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };
  
  const terryRealPrompt = "Act as a couples coach using Terry Real's approach, blending direct advice and thought-provoking questions. Focus on identifying core concepts like the harmony-disharmony-repair cycle, the adaptive child versus the wise adult, and the five losing strategies. Focus less on giving the user reassurance, and more on questioning their beliefs. Invite them subtly to reflect and gain new insights about themselves. Each session should last around 25 minutes: the first 10 minutes inviting the user to open up, with active listening and gentle nudges if needed. The next 10 minutes address core issues and any identified losing strategies, and the final 5 minutes wrap up positively. Use examples from Terry Real's book \"Us\".";
  
  const containsTerryRealPrompt = value.includes(terryRealPrompt);
  
  return (
    <div className="space-y-2">
      <div className="flex flex-row items-center justify-between">
        <label htmlFor="instructions" className="block font-medium text-gray-700">
          Bot Instructions
        </label>
        <span className="text-sm text-gray-500">
          Last updated: {formatDateTime(lastUpdated)}
        </span>
      </div>
      <Textarea
        id="instructions"
        value={value}
        onChange={onChange}
        className="min-h-[300px]"
        placeholder="Enter bot instructions..."
      />
      <p className="text-sm text-gray-500">
        Character count: {value.length}
      </p>
      
      {containsTerryRealPrompt ? (
        <p className="text-sm text-green-600">
          ✓ Contains Terry Real approach prompt
        </p>
      ) : (
        <p className="text-sm text-amber-600">
          ⚠ Does not contain Terry Real approach prompt
        </p>
      )}
      
      {!containsTerryRealPrompt && (
        <button 
          onClick={() => onChange({ target: { value: terryRealPrompt + (value.length > 0 ? "\n\n" + value : "") } } as React.ChangeEvent<HTMLTextAreaElement>)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          type="button"
        >
          Add Terry Real prompt
        </button>
      )}
    </div>
  );
};

export default InstructionsEditor;
