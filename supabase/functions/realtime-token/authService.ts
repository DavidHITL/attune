
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function authenticateUser(authHeader: string | null): Promise<any> {
  if (!authHeader) {
    console.log("No auth header provided");
    return null;
  }
  
  try {
    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      console.log("Invalid token format");
      return null;
    }
    
    // Verify the token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error("Auth error:", error.message);
      return null;
    }
    
    if (!user) {
      console.log("No user found for token");
      return null;
    }
    
    console.log(`User authenticated: ${user.id}`);
    return user;
  } catch (error) {
    console.error("Error in authenticateUser:", error);
    return null;
  }
}
