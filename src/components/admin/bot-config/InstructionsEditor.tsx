
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
      
      {value.includes('Terry Real') ? (
        <p className="text-sm text-green-600">
          ✓ Contains Terry Real approach
        </p>
      ) : (
        <p className="text-sm text-amber-600">
          ⚠ Does not contain Terry Real approach
        </p>
      )}
    </div>
  );
};

export default InstructionsEditor;
