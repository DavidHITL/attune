
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import GrowthInsights from '@/components/insights/GrowthInsights';
import { LogOut } from 'lucide-react';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged out successfully"
    });
  };
  
  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-4xl">
      <div className="w-full max-w-lg p-6">
        {user && <GrowthInsights />}
        
        <Button 
          onClick={handleSignOut} 
          variant="outline" 
          className="w-full mt-8 text-black border-white/10 hover:bg-white/10 font-sans"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
