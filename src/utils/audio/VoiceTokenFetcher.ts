
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPABASE_URL } from '@/env';

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
      
      // Log the offer details for debugging
      console.log('[VoiceTokenFetcher] Fetching voice token with offer type:', offer.type);
      console.log('[VoiceTokenFetcher] Offer SDP length:', offer.sdp?.length || 0);
      
      // Format the request body properly - this was likely the issue
      const requestBody = {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      };
      
      // Use the environment variable directly instead of accessing protected property
      const url = `${SUPABASE_URL}/functions/v1/realtime-token`;
      
      // Enhanced diagnostic logging using the specified format
      console.log('TOKEN ▶︎ POST', url);
      console.log('TOKEN ▶︎ body', JSON.stringify(requestBody));
      
      const response = await supabase.functions.invoke('realtime-token', { 
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Log the response status and details in the requested format
      const responseStatus = response.error ? response.error.status || 500 : 200;
      console.log('TOKEN ▶︎ status', responseStatus);
      
      let responseText = '';
      if (response.error) {
        responseText = JSON.stringify(response.error);
        console.log('TOKEN ▶︎ text', responseText);
        
        // Show toast with error details
        const truncatedResponse = responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '');
        toast.error(`Voice connection failed (${responseStatus})`, {
          description: truncatedResponse,
          duration: 5000
        });

        throw new Error(`VoiceConnectionError: Edge function returned error (${responseStatus}): ${responseText}`);
      } else {
        responseText = JSON.stringify(response.data);
        console.log('TOKEN ▶︎ text', responseText);
      }
      
      // Validate response structure
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
      return response.data as { answer: RTCSessionDescriptionInit; iceServers?: RTCIceServer[] };
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
