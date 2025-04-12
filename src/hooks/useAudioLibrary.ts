
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface AudioContent {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration: number;
  is_featured: boolean;
  rank: number;
  created_at: string;
  updated_at: string;
  progress?: {
    progress_seconds: number | null;
    completed: boolean | null;
  } | null;
}

export function useAudioLibrary() {
  const [loading, setLoading] = useState(true);
  const [featuredContent, setFeaturedContent] = useState<AudioContent | null>(null);
  const [audioContent, setAudioContent] = useState<AudioContent[]>([]);
  const { user } = useAuth();

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      
      // Fetch audio content
      let query = supabase
        .from('audio_content')
        .select('*')
        .order('rank', { ascending: true });
      
      const { data: contentData, error: contentError } = await query;
      
      if (contentError) throw contentError;
      
      // If user is logged in, fetch their progress
      let contentWithProgress = contentData || [];
      
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('content_id, progress_seconds, completed')
          .eq('user_id', user.id);
        
        if (!progressError && progressData) {
          // Map progress data to content
          contentWithProgress = contentData?.map(content => {
            const progress = progressData.find(p => p.content_id === content.id);
            return {
              ...content,
              progress: progress ? {
                progress_seconds: progress.progress_seconds,
                completed: progress.completed
              } : null
            };
          }) || [];
        }
      }
      
      // Find featured content
      const featured = contentWithProgress.find(item => item.is_featured) || contentWithProgress[0] || null;
      setFeaturedContent(featured);
      
      // Set remaining content (excluding featured)
      const remaining = featured 
        ? contentWithProgress.filter(item => item.id !== featured.id) 
        : contentWithProgress;
      
      setAudioContent(remaining);
    } catch (error) {
      console.error("Error fetching audio library:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (contentId: string, seconds: number, completed = false) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          content_id: contentId,
          progress_seconds: seconds,
          completed,
          last_played_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,content_id'
        });
      
      if (error) throw error;
      
      // Refresh the library to update UI
      fetchLibrary();
      
      return data;
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  return {
    loading,
    featuredContent,
    audioContent,
    updateProgress,
    refreshLibrary: fetchLibrary
  };
}
