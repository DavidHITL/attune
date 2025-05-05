
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
    try {
      // Get auth token to pass to the edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Failed to get auth session:", sessionError);
        throw new Error(`Auth session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.warn("No active session found, proceeding with anonymous access");
      }
      
      // Get token from edge function
      const accessToken = session?.access_token || null;
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only add Authorization header if we have a token
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log("Using authentication token for edge function");
      } else {
        console.log("No authentication token available, using anonymous access");
      }
      
      console.log("Calling realtime-token edge function with auth:", !!accessToken);
      
      // Call the edge function with explicit handling for both auth and non-auth cases
      // Improved error handling with try/catch
      try {
        const response = await supabase.functions.invoke('realtime-token', {
          method: 'POST',
          headers: headers,
          body: { anonymous: !accessToken }
        });
        
        if (response.error) {
          console.error("Error from edge function:", response.error);
          throw new Error(`Failed to get session token: ${response.error.message || 'Unknown error'}`);
        }
        
        const data = response.data;
        
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
      } catch (invokeError) {
        // More detailed error for edge function invocation failures
        console.error("Failed to invoke realtime-token function:", invokeError);
        throw new Error(`Failed to get voice authorization: ${invokeError.message || 'Edge function error'}`);
      }
    } catch (error) {
      console.error("Error in getSessionToken:", error);
      throw error;
    }
  }
}
