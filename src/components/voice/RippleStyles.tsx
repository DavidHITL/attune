
import React from 'react';

const RippleCirclesCompact: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        w-64 h-64 bg-white/10 rounded-full animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        w-48 h-48 bg-white/5 rounded-full animate-pulse delay-300"></div>
    </div>
  );
};

export default RippleCirclesCompact;
export { RippleCirclesCompact };
