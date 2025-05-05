
import { supabase } from '@/integrations/supabase/client';

export class VoiceTokenFetcher {
  /**
   * Fetches a voice token from the Supabase Edge Function
   */
  static async fetchVoiceToken(offer: RTCSessionDescriptionInit): Promise<{ 
    answer: string; 
    iceServers?: RTCIceServer[] 
  }> {
    try {
      // Invoke Supabase edge function
      console.log('[VoiceTokenFetcher] Fetching voice token with offer type:', offer.type);
      
      const response = await supabase.functions.invoke('realtime-token', { 
        body: { offer },
        headers: {
          'Content-Type': 'application/json'
        }
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
      
      console.log('[VoiceTokenFetcher] Successfully received token');
      return response.data as { answer: string; iceServers?: RTCIceServer[] };
    } catch (error) {
      console.error('[VoiceTokenFetcher] Error fetching voice token:', error);
      throw error;
    }
  }

  /**
   * Helper method to create a test token for testing without hitting the actual API
   */
  static async fetchTestToken(): Promise<{ 
    answer: string; 
    iceServers?: RTCIceServer[] 
  }> {
    try {
      // Create a dummy offer with a special type that signals the edge function
      // to return a test response instead of calling the OpenAI API
      const dummyOffer: RTCSessionDescriptionInit = {
        type: 'dummy-test',
        sdp: 'dummy-sdp-for-testing'
      };
      
      return await this.fetchVoiceToken(dummyOffer);
    } catch (error) {
      console.error('[VoiceTokenFetcher] Error fetching test token:', error);
      throw error;
    }
  }
}
