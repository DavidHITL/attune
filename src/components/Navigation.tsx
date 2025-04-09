
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
        <Link to="/">
          <div className="text-attune-purple text-2xl font-bold">Attune</div>
        </Link>

        <div className="flex gap-6">
          <Link 
            to="/" 
            className={`text-attune-purple hover:text-attune-indigo transition-colors ${
              location.pathname === '/' ? 'text-attune-indigo' : ''
            }`}
          >
            <Home className="w-6 h-6" />
          </Link>
          
          <Link 
            to="/voice" 
            className={`text-attune-purple hover:text-attune-indigo transition-colors ${
              location.pathname === '/voice' ? 'text-attune-indigo' : ''
            }`}
          >
            <Info className="w-6 h-6" />
          </Link>
          
          <Link 
            to={user ? '/profile' : '/auth'} 
            className={`text-attune-purple hover:text-attune-indigo transition-colors ${
              location.pathname === '/profile' || location.pathname === '/auth' ? 'text-attune-indigo' : ''
            }`}
          >
            <User className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
