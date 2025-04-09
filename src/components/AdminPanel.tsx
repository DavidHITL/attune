
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const AdminPanel = () => {
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchCurrentInstructions();
  }, []);
  
  const fetchCurrentInstructions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_config')
        .select('instructions')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setInstructions(data.instructions);
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
  };
  
  const updateInstructions = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bot_config')
        .update({ 
          instructions: instructions,
          updated_at: new Date().toISOString()
        })
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Bot instructions updated successfully."
      });
    } catch (error) {
      console.error("Error updating instructions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update instructions."
      });
    } finally {
      setSaving(false);
    }
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
            <label htmlFor="instructions" className="block font-medium text-gray-700">
              Bot Instructions
            </label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[200px]"
              placeholder="Enter bot instructions..."
            />
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
