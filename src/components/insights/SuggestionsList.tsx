
import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { UserInsight } from '@/utils/types';

interface SuggestionsListProps {
  suggestions: string[];
  className?: string;
}

const SuggestionsList = ({ suggestions, className }: SuggestionsListProps) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center p-4 text-gray-400">
        No suggestions available yet.
      </div>
    );
  }

  return (
    <ul className={`space-y-3.5 ${className}`}>
      {suggestions.map((suggestion, index) => (
        <li key={index} className="relative pl-8 group">
          <div className="absolute left-0 top-0 rounded-full bg-emerald-500/20 p-1">
            <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-sm leading-relaxed text-gray-100">
            {suggestion}
          </div>
          <div className="absolute h-full w-0.5 bg-gradient-to-b from-emerald-500/30 to-transparent left-2 top-5 -z-10" />
        </li>
      ))}
    </ul>
  );
};

export default SuggestionsList;
