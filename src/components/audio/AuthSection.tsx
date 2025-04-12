
import React from 'react';
import { Link } from 'react-router-dom';

interface AuthSectionProps {
  isLoggedIn: boolean;
}

const AuthSection: React.FC<AuthSectionProps> = ({ isLoggedIn }) => {
  if (isLoggedIn) return null;
  
  return (
    <div className="flex justify-center my-8">
      <Link
        to="/auth" 
        className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 transition-colors font-sans inline-block"
      >
        Sign In
      </Link>
    </div>
  );
};

export default AuthSection;
