
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#EEE0CB]">
      <div className="h-full flex flex-col items-center justify-center text-center max-w-[390px] px-4">
        <AttuneLogo />
        
        <div className="mt-8 text-center">
          <p className="text-black font-sans">
            "Love isn't something that you have. It's something you do. And you can do it better." — Terry Real
          </p>
          
          {!user && (
            <div className="mt-6">
              <a 
                href="/auth" 
                className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors font-sans inline-block"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttuneContent;
