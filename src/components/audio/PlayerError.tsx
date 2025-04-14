
import React from 'react';
import { Button } from '@/components/ui/button';

interface PlayerErrorProps {
  error: string;
}

const PlayerError: React.FC<PlayerErrorProps> = ({ error }) => {
  return (
    <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
      {error}
      <Button
        variant="link"
        size="sm"
        onClick={() => window.location.reload()}
        className="text-red-600 underline pl-1"
      >
        Refresh page
      </Button>
    </div>
  );
};

export default PlayerError;
