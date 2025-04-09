
import { supabase } from './supabaseClient.ts';

export interface User {
  id: string;
}

export async function authenticateUser(authHeader: string | null): Promise<User | null> {
  if (!authHeader) {
    console.log("No Authorization header present");
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    console.log("Auth token received:", token ? "Present (not shown for security)" : "Missing");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error("Auth error:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (user) {
      console.log("Authenticated user ID:", user.id);
      return { id: user.id };
    }
  } catch (authError) {
    console.error("Error parsing auth header:", authError);
    throw new Error(`Auth header parsing error: ${authError.message}`);
  }
  
  return null;
}
