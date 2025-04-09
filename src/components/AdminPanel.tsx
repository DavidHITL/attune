
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const AdminPanel = () => {
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();
  
  const fetchCurrentInstructions = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching current instructions from database...");
      
      const { data, error } = await supabase
        .from('bot_config')
        .select('instructions, updated_at, id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setInstructions(data.instructions);
        setLastUpdated(data.updated_at);
        
        console.log("Fetched current instructions:", data.instructions.substring(0, 100) + "...");
        console.log("Instructions length:", data.instructions.length);
        console.log("Bot config ID:", data.id);
        console.log("Last updated:", data.updated_at);
        
        // Check if instructions contain Terry Real approach indicators
        const terryRealApproach = data.instructions.includes('Terry Real') && 
          data.instructions.includes('harmony-disharmony-repair');
        
        console.log("Instructions appear to use Terry Real approach:", terryRealApproach);
      }
    } catch (error) {
      console.error("Error fetching instructions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch current instructions."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchCurrentInstructions();
    
    // Listen for refresh events from parent component
    const handleRefresh = () => {
      console.log("Refresh event received, fetching current instructions");
      fetchCurrentInstructions();
    };
    
    document.getElementById('admin-panel')?.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.getElementById('admin-panel')?.removeEventListener('refresh', handleRefresh);
    };
  }, [fetchCurrentInstructions]);
  
  const updateInstructions = async () => {
    if (!instructions.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Instructions cannot be empty."
      });
      return;
    }
    
    setSaving(true);
    try {
      console.log("Sending instructions update request...");
      console.log("Instructions length:", instructions.length);
      console.log("Instructions excerpt:", instructions.substring(0, 100) + "...");
      
      // Use the edge function to update instructions
      const response = await supabase.functions.invoke('update-instructions', {
        body: { instructions: instructions },
      });
      
      if (response.error) {
        console.error("Update error:", response.error);
        throw new Error(response.error.message || 'Unknown error');
      }
      
      console.log("Update response:", response.data);
      
      // Verify the update by refetching
      await fetchCurrentInstructions();
      
      toast({
        title: "Success",
        description: `Bot instructions updated successfully. Length: ${instructions.length} characters.`
      });
    } catch (error) {
      console.error("Error updating instructions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update instructions: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setSaving(false);
    }
  };
  
  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "Never";
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };
  
  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-800">Bot Configuration</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p>Loading instructions...</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex flex-row items-center justify-between">
              <label htmlFor="instructions" className="block font-medium text-gray-700">
                Bot Instructions
              </label>
              <span className="text-sm text-gray-500">
                Last updated: {formatDateTime(lastUpdated)}
              </span>
            </div>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[300px]"
              placeholder="Enter bot instructions..."
            />
            <p className="text-sm text-gray-500">
              Character count: {instructions.length}
            </p>
            
            {instructions.includes('Terry Real') ? (
              <p className="text-sm text-green-600">
                ✓ Contains Terry Real approach
              </p>
            ) : (
              <p className="text-sm text-amber-600">
                ⚠ Does not contain Terry Real approach
              </p>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={updateInstructions}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Update Instructions'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
