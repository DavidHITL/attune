
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';

const Voice = () => {
  const { user, loading } = useAuth();
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-attune-deep-blue flex flex-col items-center py-12 px-4 pt-20 pb-24 text-white font-sans">
        <div className="w-full max-w-[390px] h-[500px] max-h-[60vh] flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-attune-deep-blue flex flex-col items-center py-12 px-4 pt-20 pb-24 text-white font-sans">
      <div className="w-full max-w-[390px] h-[500px] max-h-[60vh]">
        {user ? (
          <RealtimeChat />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <AttuneLogo />
            <h2 className="text-xl font-semibold mb-4 mt-8 text-white">
              Feel like talking?
            </h2>
            <p className="text-white mb-6">
              Attune remembers conversations, and keeps them secret, so you can always pick up where you left off — or not.
            </p>
            <Link to="/auth" className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 transition-colors font-sans inline-block">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Voice;
