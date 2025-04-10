
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';

const AdminPanel = () => {
  const [instructions, setInstructions] = useState<string>('');
  const [voice, setVoice] = useState<string>('alloy');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();
  
  const fetchCurrentConfig = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching current bot configuration from database...");
      
      const { data, error } = await supabase
        .from('bot_config')
        .select('instructions, voice, updated_at, id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setInstructions(data.instructions);
        setVoice(data.voice || 'alloy');
        setLastUpdated(data.updated_at);
        
        console.log("Fetched current instructions:", data.instructions.substring(0, 100) + "...");
        console.log("Instructions length:", data.instructions.length);
        console.log("Voice setting:", data.voice);
        console.log("Bot config ID:", data.id);
        console.log("Last updated:", data.updated_at);
        
        // Check if instructions contain Terry Real approach indicators
        const terryRealApproach = data.instructions.includes('Terry Real') && 
          data.instructions.includes('harmony-disharmony-repair');
        
        console.log("Instructions appear to use Terry Real approach:", terryRealApproach);
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch current bot configuration."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchCurrentConfig();
    
    // Listen for refresh events from parent component
    const handleRefresh = () => {
      console.log("Refresh event received, fetching current instructions");
      fetchCurrentConfig();
    };
    
    document.getElementById('admin-panel')?.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.getElementById('admin-panel')?.removeEventListener('refresh', handleRefresh);
    };
  }, [fetchCurrentConfig]);
  
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
      console.log("Voice setting:", voice);
      
      // Use the edge function to update instructions
      const response = await supabase.functions.invoke('update-instructions', {
        body: { 
          instructions: instructions,
          voice: voice 
        },
      });
      
      if (response.error) {
        console.error("Update error:", response.error);
        throw new Error(response.error.message || 'Unknown error');
      }
      
      console.log("Update response:", response.data);
      
      // Verify the update by refetching
      await fetchCurrentConfig();
      
      toast({
        title: "Success",
        description: `Bot configuration updated successfully. Voice: ${voice}, Instructions length: ${instructions.length} characters.`
      });
    } catch (error) {
      console.error("Error updating configuration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update configuration: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setSaving(false);
    }
  };

  const updateVoice = async (newVoice: string) => {
    setVoice(newVoice);
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
          <p>Loading configuration...</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="block font-medium text-gray-700">
              Bot Voice
            </label>
            <Select value={voice} onValueChange={updateVoice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alloy">Alloy - Neutral</SelectItem>
                <SelectItem value="echo">Echo - Male</SelectItem>
                <SelectItem value="fable">Fable - Male</SelectItem>
                <SelectItem value="onyx">Onyx - Male</SelectItem>
                <SelectItem value="nova">Nova - Female</SelectItem>
                <SelectItem value="shimmer">Shimmer - Female</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Choose the voice personality for the bot
            </p>
          </div>

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
              {saving ? 'Saving...' : 'Update Configuration'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
