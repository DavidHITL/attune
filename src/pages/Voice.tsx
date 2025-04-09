import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import RealtimeChat from '@/components/RealtimeChat';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import AttuneLogo from '@/components/AttuneLogo';
const Voice = () => {
  const {
    user,
    loading
  } = useAuth();
  const {
    setBackgroundColor
  } = useBackground();
  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);
  if (loading) {
    return <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
        <div className="w-full max-w-[390px] h-[500px] max-h-[60vh] flex items-center justify-center">
          <p className="text-attune-purple">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center py-12 px-4 pt-20 text-black font-sans">
      <div className="w-full max-w-[390px] h-[500px] max-h-[60vh]">
        {user ? <RealtimeChat /> : <div className="h-full flex flex-col items-center justify-center text-center">
            <AttuneLogo />
            
            
            
            <h2 className="text-xl font-semibold mb-4 text-attune-purple">
        </h2>
            <p className="text-attune-purple/80 mb-6">Sign in for a chat.</p>
            <Button asChild className="bg-attune-purple hover:bg-attune-purple/80">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>}
      </div>
    </div>;
};
export default Voice;