
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RippleCirclesCompact } from '@/components/voice/RippleStyles';
import { UserInsight } from '@/utils/types';

interface TriggersListProps {
  triggers: string[];
  className?: string;
}

const TriggersList = ({ triggers, className }: TriggersListProps) => {
  if (!triggers || triggers.length === 0) {
    return (
      <div className="text-center p-4 text-gray-400">
        No triggers identified yet.
      </div>
    );
  }

  return (
    <ul className={`space-y-3 relative ${className}`}>
      {triggers.map((trigger, index) => (
        <li key={index} className="flex items-start gap-2.5 group">
          <div className="relative flex-shrink-0 mt-1">
            <div className="h-3 w-3 rounded-full bg-orange-500/70 group-hover:bg-orange-500 transition-colors" />
            <div className="absolute inset-0 -m-1 rounded-full animate-pulse bg-orange-500/30" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white leading-relaxed">{trigger}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TriggersList;
