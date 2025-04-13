
import React from 'react';

export const RippleStyles: React.FC = () => {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .ripple {
        position: absolute;
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 600ms linear;
        pointer-events: none;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `}} />
  );
};

export default RippleStyles;
