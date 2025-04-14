
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';
import { Skeleton } from '@/components/ui/skeleton';

const Voice = () => {
  const { user, loading } = useAuth();
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);

  return (
    <div className="min-h-screen h-screen overflow-hidden relative bg-[#1B4965]">
      <div className="relative z-10 h-full flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-[390px] h-[calc(100vh-120px)] max-h-[calc(100vh-120px)]">
          {loading ? (
            <div className="h-full flex flex-col items-center">
              <AttuneLogo />
              <div className="flex-1 w-full flex flex-col items-center justify-center mt-8 space-y-4">
                <Skeleton className="h-8 w-3/4 bg-white/10" />
                <Skeleton className="h-24 w-4/5 bg-white/10" />
                <div className="mt-auto mb-16 flex justify-center space-x-6">
                  <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
                  <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          ) : user ? (
            <RealtimeChat />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <AttuneLogo />
              <h2 className="text-2xl font-semibold mb-4 mt-8 text-white">
                Feel like talking?
              </h2>
              <p className="text-white mb-6 px-4">
                Attune remembers conversations, and keeps them secret, so you can always pick up where you left off — or not.
              </p>
              <Link to="/auth" className="bg-white text-black px-6 py-2 rounded-full hover:bg-gray-100 transition-colors font-sans inline-block">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Voice;
