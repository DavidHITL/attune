
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
          src="/lovable-uploads/16dc81de-afe6-4cfb-88ee-4b63e9d9957d.png" 
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
