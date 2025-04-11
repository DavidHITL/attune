
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Get Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Audio content to seed
  const audioContent = [
    {
      title: "Mindful Morning Meditation",
      description: "Start your day with this 10-minute guided meditation to set a positive tone for the day ahead.",
      audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
      cover_image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773",
      duration: 600, // 10 minutes
      is_featured: true,
      category_id: null, // Will be updated after fetching categories
    },
    {
      title: "Deep Sleep Journey",
      description: "A soothing 20-minute audio designed to help you fall into a deep and restful sleep.",
      audio_url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6435fe9.mp3",
      cover_image_url: "https://images.unsplash.com/photo-1455642305337-78696a5115ca",
      duration: 1200, // 20 minutes
      is_featured: false,
      category_id: null,
    },
    {
      title: "Focus Flow State",
      description: "Ambient sounds to help you enter a flow state and maximize your productivity.",
      audio_url: "https://cdn.pixabay.com/download/audio/2021/04/07/audio_7eebb668bb.mp3",
      cover_image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
      duration: 1800, // 30 minutes
      is_featured: false,
      category_id: null,
    },
    {
      title: "Anxiety Relief",
      description: "Guided breathing exercise to help reduce anxiety and promote a sense of calm.",
      audio_url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8a449928b.mp3",
      cover_image_url: "https://images.unsplash.com/photo-1499728603263-13726abce5fd",
      duration: 900, // 15 minutes
      is_featured: false,
      category_id: null,
    },
    {
      title: "Evening Unwind",
      description: "A gentle audio experience to help you transition from a busy day to a peaceful evening.",
      audio_url: "https://cdn.pixabay.com/download/audio/2021/08/08/audio_7d7a6f58ce.mp3",
      cover_image_url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8",
      duration: 1200, // 20 minutes
      is_featured: false,
      category_id: null,
    }
  ];

  try {
    // Get categories
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');
    
    if (categoryError) throw categoryError;
    
    // Map category names to content
    const mappedContent = audioContent.map(item => {
      let categoryId = null;
      
      if (item.title.includes('Meditation')) {
        categoryId = categories.find(c => c.name === 'Meditation')?.id;
      } else if (item.title.includes('Sleep')) {
        categoryId = categories.find(c => c.name === 'Sleep')?.id;
      } else if (item.title.includes('Focus')) {
        categoryId = categories.find(c => c.name === 'Focus')?.id;
      } else {
        categoryId = categories.find(c => c.name === 'Wellness')?.id;
      }
      
      return {
        ...item,
        category_id: categoryId
      };
    });
    
    // Insert content
    const { data, error } = await supabase
      .from('audio_content')
      .insert(mappedContent)
      .select();
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ success: true, message: "Sample audio content added", data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
