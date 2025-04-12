
import React from 'react';
import { useLocation } from 'react-router-dom';

const AttuneLogo: React.FC = () => {
  const location = useLocation();
  const isVoicePage = location.pathname === '/voice';
  
  return (
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/668ddfe1-1e35-4f13-ab21-4998e4fe7e88.png"
        alt="Attune Logo"
        width="100" 
        height="100"
        className={`mb-2 ${isVoicePage ? 'filter invert' : ''}`}
      />
      <h1 className={`text-5xl font-sans font-bold ${isVoicePage ? 'text-white' : 'text-black'}`}>Attune</h1>
    </div>
  );
};

export default AttuneLogo;
