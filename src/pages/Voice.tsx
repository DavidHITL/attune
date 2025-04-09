
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';

const Voice = () => {
  const { user, loading } = useAuth();
  const { setBackgroundColor } = useBackground();

  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
        <div className="w-full max-w-[390px] h-[500px] max-h-[60vh] flex items-center justify-center">
          <p className="text-attune-purple">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
      <div className="w-full max-w-[390px] h-[500px] max-h-[60vh]">
        {user ? (
          <RealtimeChat />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-semibold mb-4 text-attune-purple">Sign In to Use Voice Assistant</h2>
            <p className="text-attune-purple/80 mb-6">
              To use the voice assistant with conversation history, please sign in or create an account.
            </p>
            <Button asChild className="bg-attune-purple hover:bg-attune-purple/80">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Voice;
