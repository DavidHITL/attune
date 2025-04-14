
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BotConfig {
  id?: string;
  instructions: string;
  voice: string;
  updated_at: string | null;
}

export function useBotConfig() {
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
  
  const updateBotConfig = async () => {
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
      console.log("Voice setting to be saved:", voice);
      
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
      
      // Check if the voice was correctly saved
      if (response.data?.voice && response.data.voice !== voice) {
        console.warn(`Warning: Requested voice "${voice}" but server saved "${response.data.voice}"`);
        setVoice(response.data.voice); // Update to what was actually saved
        toast({
          title: "Note",
          description: `Voice was saved as "${response.data.voice}" (requested: "${voice}")`
        });
      }
      
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

  return {
    instructions,
    setInstructions,
    voice,
    setVoice,
    loading,
    saving,
    lastUpdated,
    fetchCurrentConfig,
    updateBotConfig
  };
}
