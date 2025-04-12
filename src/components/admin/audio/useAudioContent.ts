
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AudioContent {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration: number;
  is_featured: boolean;
  rank: number;
  [key: string]: any;
}

export function useAudioContent() {
  const [loading, setLoading] = useState(true);
  const [audioContent, setAudioContent] = useState<AudioContent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<AudioContent | null>(null);
  
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch audio content
      const { data: contentData } = await supabase
        .from('audio_content')
        .select('*')
        .order('rank', { ascending: true });
      
      setAudioContent(contentData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleEdit = useCallback((item: AudioContent) => {
    setCurrentItem(item);
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      const { error } = await supabase
        .from('audio_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Audio content deleted"
      });
      
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete data"
      });
    }
  }, [fetchData, toast]);

  const updateRank = useCallback(async (id: string, newRank: number) => {
    try {
      const { error } = await supabase
        .from('audio_content')
        .update({ rank: newRank })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchData();
    } catch (error) {
      console.error("Error updating rank:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update rank"
      });
    }
  }, [fetchData, toast]);

  const moveItemUp = useCallback((index: number) => {
    if (index <= 0) return;
    
    const currentItem = audioContent[index];
    const itemAbove = audioContent[index - 1];
    
    updateRank(currentItem.id, itemAbove.rank);
    updateRank(itemAbove.id, currentItem.rank);
  }, [audioContent, updateRank]);

  const moveItemDown = useCallback((index: number) => {
    if (index >= audioContent.length - 1) return;
    
    const currentItem = audioContent[index];
    const itemBelow = audioContent[index + 1];
    
    updateRank(currentItem.id, itemBelow.rank);
    updateRank(itemBelow.id, currentItem.rank);
  }, [audioContent, updateRank]);

  const resetForm = useCallback(() => {
    setIsEditing(false);
    setCurrentItem(null);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    audioContent,
    isEditing,
    currentItem,
    fetchData,
    handleEdit,
    handleDelete,
    resetForm,
    moveItemUp,
    moveItemDown
  };
}
