
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';
import AdminContentGuide from '@/components/AdminContentGuide';
import { Link } from 'react-router-dom';

// Separate component for the hero section that's always visible
export const AttuneHero = () => {
  return (
    <div className="mb-8 text-center">
      <div className="mb-6">
        <AttuneLogo />
      </div>
    </div>
  );
};

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="w-full max-w-[390px] h-[500px] max-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <AttuneHero />
        
        {!user ? (
          <div className="mt-8">
            <Link
              to="/auth" 
              className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 transition-colors font-sans inline-block"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <AdminContentGuide />
        )}
      </div>
    </div>
  );
};

export default AttuneContent;
