
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center w-full">
      <AttuneLogo />
      
      <div className="mt-10 text-center max-w-[350px]">
        <p className="text-attune-purple/80">
          "Love isn't something that you have. It's something you do. And you can do it better." — Terry Real
        </p>
        
        {!user && (
          <div className="mt-6">
            <a 
              href="/auth" 
              className="bg-attune-purple text-white px-6 py-2 rounded-full hover:bg-attune-indigo transition-colors"
            >
              Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttuneContent;
