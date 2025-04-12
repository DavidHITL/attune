
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';
import AdminContentGuide from '@/components/AdminContentGuide';
import { Link } from 'react-router-dom';

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#EEE0CB]">
      <div className="w-full max-w-[390px] h-[500px] max-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="mb-8">
          <AttuneLogo />
        </div>
        
        <div className="mb-8">
          <p className="text-black font-sans">
            "Love isn't something that you have. It's something you do. And you can do it better." — Terry Real
          </p>
          
          {!user ? (
            <div className="mt-8">
              <Link
                to="/auth" 
                className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors font-sans inline-block"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <AdminContentGuide />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttuneContent;
