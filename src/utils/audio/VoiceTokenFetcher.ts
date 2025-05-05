
import { supabase } from '@/integrations/supabase/client';

export class VoiceTokenFetcher {
  /**
   * Fetches a voice token from the Supabase Edge Function
   */
  static async fetchVoiceToken(offer: RTCSessionDescriptionInit): Promise<{ 
    answer: string; 
    iceServers?: RTCIceServer[] 
  }> {
    // Invoke Supabase edge function
    const response = await supabase.functions.invoke('realtime-token', { 
      body: { offer } 
    });

    // Enhanced error handling
    if (response.error) {
      console.error('[VoiceTokenFetcher] Edge function error:', response.error);
      throw new Error(`VoiceConnectionError: Edge function returned error: ${response.error.message}`);
    }
    
    if (!response.data) {
      console.error('[VoiceTokenFetcher] Empty response from edge function');
      throw new Error('VoiceConnectionError: No data received from server');
    }
    
    // Validate response structure
    if (typeof response.data !== 'object') {
      console.error('[VoiceTokenFetcher] Expected JSON object, got:', response.data);
      throw new Error('VoiceConnectionError: Malformed response from server');
    }
    
    // Check if response has required fields
    if (!response.data.answer) {
      console.error('[VoiceTokenFetcher] Missing answer in response:', response.data);
      throw new Error('VoiceConnectionError: Missing SDP answer from server');
    }
    
    try {
      // Verify the answer is valid JSON before continuing
      JSON.parse(response.data.answer);
    } catch (error) {
      console.error('[VoiceTokenFetcher] Invalid SDP answer format:', error);
      throw new Error('VoiceConnectionError: Invalid SDP answer format');
    }
    
    return response.data as { answer: string; iceServers?: RTCIceServer[] };
  }
}
