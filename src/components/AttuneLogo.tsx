
import React from 'react';

const AttuneLogo: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-2"
      >
        <path
          d="M50 15C31.215 15 16 30.215 16 49C16 67.785 31.215 83 50 83C68.785 83 84 67.785 84 49C84 30.215 68.785 15 50 15Z"
          stroke="#310A31"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M50 15C50 15 50 49 50 49M50 49C50 49 68 49 68 49"
          stroke="#310A31"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <h1 className="text-5xl font-bold text-attune-purple">ATTUNE</h1>
    </div>
  );
};

export default AttuneLogo;
