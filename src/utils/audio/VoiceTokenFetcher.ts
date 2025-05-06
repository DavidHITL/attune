
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPABASE_KEY } from '@/env';

export class VoiceTokenFetcher {
  /**
   * Fetches a voice token from the Supabase Edge Function
   */
  static async fetchVoiceToken(offer: RTCSessionDescriptionInit): Promise<{ 
    answer: RTCSessionDescriptionInit; 
    iceServers?: RTCIceServer[] 
  }> {
    try {
      // Validate offer before sending
      if (!offer || !offer.type || !offer.sdp) {
        console.error('[VoiceTokenFetcher] Invalid offer provided:', offer);
        throw new Error('VoiceConnectionError: Invalid offer object');
      }
      
      // ENHANCED VALIDATION: Check for audio section in SDP
      if (!offer.sdp.includes('m=audio')) {
        console.error('[VoiceTokenFetcher] SDP offer does not contain audio media section:', offer.sdp);
        throw new Error('VoiceConnectionError: SDP offer missing audio media section');
      }
      
      // Log the offer details for debugging
      console.log('[VoiceTokenFetcher] Fetching voice token with offer type:', offer.type);
      console.log('[VoiceTokenFetcher] Offer SDP length:', offer.sdp?.length || 0);
      console.log('[VoiceTokenFetcher] SDP offer contains audio section:', offer.sdp.includes('m=audio'));
      
      // Format the request body properly
      const requestBody = {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      };
      
      // Hardcode the URL directly instead of using environment variable
      const url = "https://pixnanztazgzrtwzdpfi.supabase.co/functions/v1/realtime-token";
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? SUPABASE_KEY;
      
      // Enhanced diagnostic logging using the specified format
      console.log('TOKEN ▶︎ POST', url);
      console.log('TOKEN ▶︎ body', JSON.stringify(requestBody));
      
      // Direct fetch with proper headers instead of using supabase.functions.invoke
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });
      
      // Log the response status
      console.log('TOKEN ▶︎ status', response.status);
      
      // Clone the response before reading the text to avoid consuming the stream
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      console.log('TOKEN ▶︎ text', responseText);
      
      if (!response.ok) {
        // Show toast with error details
        const truncatedResponse = responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '');
        toast.error(`Voice connection failed (${response.status})`, {
          description: truncatedResponse,
          duration: 5000
        });

        throw new Error(`VoiceConnectionError: Edge function returned error (${response.status}): ${responseText}`);
      }
      
      // Parse the response as JSON
      const data = JSON.parse(responseText);
      
      // Validate response structure
      if (!data) {
        console.error('[VoiceTokenFetcher] Empty response from edge function');
        throw new Error('VoiceConnectionError: No data received from server');
      }
      
      // Validate response structure
      if (typeof data !== 'object') {
        console.error('[VoiceTokenFetcher] Expected JSON object, got:', data);
        throw new Error('VoiceConnectionError: Malformed response from server');
      }
      
      // Check if response has required fields
      if (!data.answer) {
        console.error('[VoiceTokenFetcher] Missing answer in response:', data);
        throw new Error('VoiceConnectionError: Missing SDP answer from server');
      }
      
      console.log('[VoiceTokenFetcher] Successfully received token');
      return data as { answer: RTCSessionDescriptionInit; iceServers?: RTCIceServer[] };
    } catch (error) {
      console.error('[VoiceTokenFetcher] Error fetching voice token:', error);
      throw error;
    }
  }

  /**
   * Helper method to create a test token for testing without hitting the actual API
   */
  static async fetchTestToken(): Promise<{ 
    answer: RTCSessionDescriptionInit; 
    iceServers?: RTCIceServer[] 
  }> {
    try {
      console.log('[VoiceTokenFetcher] Fetching test token');
      // Create a dummy offer with a special type that signals the edge function
      // to return a test response instead of calling the OpenAI API
      const dummyOffer: RTCSessionDescriptionInit = {
        type: 'offer' as RTCSdpType, // Using a valid RTCSdpType value
        sdp: 'dummy-sdp-for-testing'
      };
      
      return await this.fetchVoiceToken(dummyOffer);
    } catch (error) {
      console.error('[VoiceTokenFetcher] Error fetching test token:', error);
      throw error;
    }
  }
}
