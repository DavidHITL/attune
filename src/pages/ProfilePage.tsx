
import React, { useEffect } from 'react';
import Profile from '@/components/Profile';
import { useBackground } from '@/context/BackgroundContext';

const ProfilePage = () => {
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor('bg-attune-blue');
  }, [setBackgroundColor]);

  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
      <div className="w-full max-w-[390px]">
        <Profile />
      </div>
    </div>
  );
};

export default ProfilePage;
