
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, User, Info } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="w-full bg-attune-blue shadow-sm py-2 px-4 flex justify-center fixed top-0 z-10">
      <div className="max-w-4xl w-full flex justify-between items-center">
        <div className="flex gap-6">
          <Link to="/" className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/' ? 'text-gray-700' : ''}`}>
            <Home className="w-6 h-6" />
          </Link>
          
          <Link to="/voice" className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/voice' ? 'text-gray-700' : ''}`}>
            <Info className="w-6 h-6" />
          </Link>
          
          <Link to={user ? '/profile' : '/auth'} className={`text-black hover:text-gray-700 transition-colors ${location.pathname === '/profile' || location.pathname === '/auth' ? 'text-gray-700' : ''}`}>
            <User className="w-6 h-6" />
          </Link>
        </div>
        
        <Link to="/">
          
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
