
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, User, Mic } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBackground } from '@/context/BackgroundContext';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { backgroundColor } = useBackground();

  return (
    <nav className={`w-full ${backgroundColor} py-2 px-4 flex justify-center fixed top-0 z-10`}>
      <div className="max-w-[390px] w-full flex justify-center items-center">
        <div className="w-full flex justify-between items-center">
          <Link to="/" className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/' ? 'text-gray-700' : ''}`}>
            <BookOpen className="w-5 h-5" />
          </Link>
          
          <Link to="/voice" className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/voice' ? 'text-gray-700' : ''}`}>
            <Mic className="w-5 h-5" />
          </Link>
          
          <Link to={user ? '/profile' : '/auth'} className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/profile' || location.pathname === '/auth' ? 'text-gray-700' : ''}`}>
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
