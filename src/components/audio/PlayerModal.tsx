
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PlayerModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const PlayerModal: React.FC<PlayerModalProps> = ({ onClose, children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={onClose}></div>
      <Card className="relative w-full max-w-[390px] shadow-xl bg-white/80 backdrop-blur-md border border-white/20 z-10">
        <CardContent className="p-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="absolute top-4 right-4 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          {children}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerModal;
