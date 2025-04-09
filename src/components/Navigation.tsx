
import React from 'react';
import AttuneLogo from './AttuneLogo';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

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
            <img 
              src="/lovable-uploads/45c09431-d0ed-467e-b0f5-40024c798d85.png"
              alt="User Icon"
              className="h-5 w-5"
            />
          </AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
};

export default Navigation;
