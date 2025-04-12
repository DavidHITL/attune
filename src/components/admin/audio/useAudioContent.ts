
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
  category_id: string | null;
  is_featured: boolean;
  category?: {
    name: string;
  };
  [key: string]: any;
}

interface Category {
  id: string;
  name: string;
}

export function useAudioContent() {
  const [loading, setLoading] = useState(true);
  const [audioContent, setAudioContent] = useState<AudioContent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<AudioContent | null>(null);
  
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(categoriesData || []);
      
      // Fetch audio content
      const { data: contentData } = await supabase
        .from('audio_content')
        .select(`
          *,
          category:categories(name)
        `)
        .order('title');
      
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
    categories,
    isEditing,
    currentItem,
    fetchData,
    handleEdit,
    handleDelete,
    resetForm
  };
}
