
import React from 'react';
import { MessageCircle, UserRound } from 'lucide-react';
import AttuneLogo from './AttuneLogo';
import { Avatar, AvatarFallback } from './ui/avatar';

const Navigation: React.FC = () => {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4">
      {/* Logo on the left */}
      <div className="flex items-center">
        <AttuneLogo />
      </div>
      
      {/* Chat icon in center */}
      <div className="flex items-center">
        <img 
          src="/lovable-uploads/f635f2f5-750e-4d4d-b2ee-b33d88617206.png" 
          alt="Chat Icon" 
          width="32" 
          height="32" 
        />
      </div>
      
      {/* User profile on the right */}
      <div className="flex items-center">
        <Avatar className="h-8 w-8 bg-attune-blue/30">
          <AvatarFallback>
            <UserRound className="h-5 w-5 text-attune-purple" />
          </AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
};

export default Navigation;
