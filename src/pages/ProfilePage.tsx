
import React, { useEffect } from 'react';
import Profile from '@/components/Profile';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';

const ProfilePage = () => {
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.DARK_PURPLE);
  }, [setBackgroundColor]);

  return (
    <div className="min-h-screen bg-attune-dark-purple flex flex-col items-center py-12 px-4 pt-20 text-white font-sans">
      <div className="w-full max-w-[390px]">
        {/* Add the logo at the top of the page */}
        <div className="mb-4 flex justify-center">
          <AttuneLogo />
        </div>
        
        {/* Growth Insights header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Personal Growth Insights</h1>
          <p className="text-sm text-gray-300 mt-2">
            Based on your conversation patterns and Terry Real's approach
          </p>
        </div>
        
        <Profile />
      </div>
    </div>
  );
};

export default ProfilePage;
