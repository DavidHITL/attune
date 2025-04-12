
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out successfully",
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-4xl mt-16">
      <div className="w-full max-w-lg p-6">
        <h2 className="text-2xl font-sans font-semibold text-white mb-6">About You</h2>
        
        {user && (
          <div className="space-y-4 mb-8">
            <p className="text-white font-sans">
              <span className="font-medium font-sans">Email:</span> {user.email}
            </p>
            <p className="text-white font-sans">
              Welcome to your Attune profile page. Here you can manage your account 
              settings and customize your voice assistant experience.
            </p>
          </div>
        )}
        
        <Button onClick={handleSignOut} variant="outline" className="w-full mt-4 text-white border-white hover:bg-white/10 font-sans">
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;

