
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, User, MessageCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBackground } from '@/context/BackgroundContext';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { backgroundColor } = useBackground();

  return (
    <nav className={`w-full ${backgroundColor} py-3 px-4 flex justify-center fixed bottom-0 z-10`}>
      <div className="max-w-[390px] w-full flex justify-center items-center">
        <div className="w-full flex justify-between items-center">
          <Link 
            to="/" 
            className={`flex items-center justify-center ${location.pathname === '/' 
              ? 'bg-white/20 backdrop-blur-md' 
              : 'bg-white/10 hover:bg-white/15'} 
              w-12 h-12 rounded-full transition-all duration-300 shadow-md`}
          >
            <BookOpen className="w-5 h-5 text-black" />
          </Link>
          
          <Link 
            to="/voice" 
            className={`flex items-center justify-center ${location.pathname === '/voice' 
              ? 'bg-white/20 backdrop-blur-md' 
              : 'bg-white/10 hover:bg-white/15'} 
              w-12 h-12 rounded-full transition-all duration-300 shadow-md`}
          >
            <MessageCircle className="w-5 h-5 text-black" />
          </Link>
          
          <Link 
            to={user ? '/profile' : '/auth'} 
            className={`flex items-center justify-center ${location.pathname === '/profile' || location.pathname === '/auth' 
              ? 'bg-white/20 backdrop-blur-md' 
              : 'bg-white/10 hover:bg-white/15'} 
              w-12 h-12 rounded-full transition-all duration-300 shadow-md`}
          >
            <User className="w-5 h-5 text-black" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
