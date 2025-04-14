
import React from 'react';
import { Button } from '@/components/ui/button';

interface PlayerErrorStateProps {
  onClose: () => void;
}

const PlayerErrorState: React.FC<PlayerErrorStateProps> = ({ onClose }) => {
  return (
    <div className="py-8 text-center">
      <h3 className="font-semibold text-lg mb-4">Error Loading Audio</h3>
      <p className="text-sm text-red-600">Unable to load audio file. The file may be missing or corrupted.</p>
      <Button onClick={onClose} className="mt-6">Close</Button>
    </div>
  );
};

export default PlayerErrorState;
