import { supabase } from '@/integrations/supabase/client';

// Extending Window interface to include our global variable
declare global {
  interface Window {
    __attuneConversationId?: string;
  }
}

export async function getOrCreateConversationId(userId: string) {
  // return cached id if we already made one this session
  if (window.__attuneConversationId) return window.__attuneConversationId;

  // try to reuse an open conversation first (optional)
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    window.__attuneConversationId = existing.id;
    return existing.id;
  }

  // otherwise create
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error) throw error;
  window.__attuneConversationId = data.id;
  return data.id;
}
