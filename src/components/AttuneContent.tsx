
import React from 'react';
import AttuneLogo from '@/components/AttuneLogo';
import { useAuth } from '@/context/AuthContext';

const AttuneContent = () => {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-4xl mt-16">
      <AttuneLogo />
      
      <div className="mt-10 text-center max-w-lg">
        <h2 className="text-2xl font-semibold text-attune-purple mb-4">
          {user ? 'Welcome Back' : 'Welcome to Attune'}
        </h2>
        <p className="text-attune-purple/80">
          {user 
            ? 'Attune helps you stay connected through natural voice conversation with our intelligent AI assistant.'
            : 'Experience natural voice conversation with our intelligent AI assistant. Sign in to get started.'}
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
