
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import AdminPanel from '@/components/AdminPanel';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [updatingInstructions, setUpdatingInstructions] = useState(false);
  const { toast } = useToast();
  const { setBackgroundColor } = useBackground();
  
  useEffect(() => {
    setBackgroundColor(BACKGROUND_COLORS.VOICE_BLUE);
  }, [setBackgroundColor]);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
        
        if (error) throw error;
        
        setIsAdmin(data || false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to verify admin privileges."
        });
      } finally {
        setCheckingAdmin(false);
      }
    };
    
    if (user) {
      checkAdminStatus();
    }
  }, [user, toast]);
  
  const updateInstructionsWithTerryReal = async () => {
    try {
      setUpdatingInstructions(true);
      
      const terryRealInstructions = `Act as a couples coach using Terry Real's approach, blending direct advice and thought-provoking questions. Focus on core concepts like the harmony-disharmony-repair cycle, the adaptive child versus the wise adult, and the five losing strategies. Each session should last around 25 minutes: the first 10 minutes inviting the user to open up, with active listening and gentle nudges if needed. The next 10 minutes address core issues and any identified losing strategies, and the final 5 minutes wrap up positively. Use examples from Terry Real's work without direct references, and always maintain a psychologically useful manner.`;
      
      console.log("Updating instructions to Terry Real approach");
      console.log("Instructions length:", terryRealInstructions.length);
      
      // Use the edge function to update the instructions
      const response = await supabase.functions.invoke('update-instructions', {
        body: { instructions: terryRealInstructions },
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Unknown error');
      }
      
      console.log("Update response:", response.data);
      
      // Now verify that the instructions were properly stored
      const { data: verifyData, error: verifyError } = await supabase
        .from('bot_config')
        .select('instructions')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (verifyError) {
        console.error("Error verifying instructions:", verifyError);
        throw new Error("Failed to verify instructions update");
      }
      
      console.log("Verified instructions from database:");
      console.log("Instructions length:", verifyData.instructions.length);
      console.log("Instructions:", verifyData.instructions.substring(0, 200) + "...");
      
      // Check if the stored instructions match what we sent
      if (verifyData.instructions !== terryRealInstructions) {
        console.error("Instructions verification failed - stored values don't match");
        console.error("Expected:", terryRealInstructions);
        console.error("Got:", verifyData.instructions);
        
        toast({
          variant: "warning",
          title: "Warning",
          description: "Instructions were updated but verification found discrepancies."
        });
      } else {
        console.log("Instructions verification successful");
        
        toast({
          title: "Success",
          description: "Bot instructions updated to Terry Real's couples coaching approach."
        });
      }
      
      // Refresh the admin panel to show updated instructions
      const adminPanelElement = document.querySelector('#admin-panel') as HTMLElement;
      if (adminPanelElement) {
        const event = new Event('refresh');
        adminPanelElement.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Error updating instructions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update instructions: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setUpdatingInstructions(false);
    }
  };
  
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center justify-center text-attune-purple">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center justify-center text-attune-purple">
        <p>Please sign in to access this page.</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center justify-center text-attune-purple">
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#6DAEDB] flex flex-col items-center py-12 px-4 pt-20 pb-24">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={updateInstructionsWithTerryReal} 
              disabled={updatingInstructions}
            >
              {updatingInstructions ? 'Updating...' : 'Update to Terry Real Approach'}
            </Button>
          </div>
        </div>
        
        <div id="admin-panel">
          <AdminPanel />
        </div>
      </div>
    </div>
  );
};

export default Admin;
