
import { supabase } from "@/integrations/supabase/client";

export interface SessionTokenResponse {
  client_secret: {
    value: string;
  };
  conversation_context?: {
    has_history: boolean;
    message_count: number;
  };
}

export class SessionManager {
  async getSessionToken(): Promise<SessionTokenResponse> {
    // Get auth token to pass to the edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Failed to get auth session:", sessionError);
    }
    
    // Get token from edge function
    const accessToken = session?.access_token || null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Only add Authorization header if we have a token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log("Using authentication token for edge function");
    } else {
      console.log("No authentication token available");
    }
    
    try {
      console.log("Calling realtime-token edge function");
      const response = await supabase.functions.invoke('realtime-token', {
        headers: headers
      });
      
      if (response.error) {
        console.error("Error from edge function:", response.error);
        throw new Error(`Failed to get session token: ${response.error.message || 'Unknown error'}`);
      }
      
      const data = await response.data;
      
      if (!data || !data.client_secret?.value) {
        console.error("Invalid session token response:", data);
        throw new Error("Invalid session token response");
      }

      // Log conversation context for debugging
      if (data.conversation_context) {
        console.log(
          "Conversation context:", 
          data.conversation_context.has_history ? 
            `Loaded ${data.conversation_context.message_count} previous messages` : 
            "No previous conversation history"
        );
      }
      
      return data;
    } catch (error) {
      console.error("Error in getSessionToken:", error);
      throw error;
    }
  }
}
