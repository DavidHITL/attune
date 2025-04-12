
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';
import AdminContentGuide from '@/components/AdminContentGuide';
import { Link } from 'react-router-dom';

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Logo section - always visible */}
      <div className="mb-6 w-full text-center">
        <AttuneLogo />
      </div>
      
      {/* Heading and quote section - always visible */}
      <div className="mb-8 w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-black">ATTUNE</h1>
        <p className="text-black font-sans">
          "Love isn't something that you have. It's something you do. And you can do it better." — Terry Real
        </p>
      </div>
      
      {/* Actions section - conditional based on auth state */}
      <div className="w-full text-center">
        {!user ? (
          <div className="mt-6">
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
