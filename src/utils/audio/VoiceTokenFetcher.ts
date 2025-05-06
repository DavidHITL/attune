
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPABASE_KEY } from '@/env';

export class VoiceTokenFetcher {
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY = 1000;
  
  /**
   * Fetches a voice token from the Supabase Edge Function with retry logic
   */
  static async fetchVoiceToken(
    offer: RTCSessionDescriptionInit,
    retryCount = 0
  ): Promise<{ 
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
      console.log(`[VoiceTokenFetcher] POST ${url} (retry: ${retryCount}/${this.MAX_RETRIES})`);
      console.log('[VoiceTokenFetcher] Request body:', JSON.stringify(requestBody).substring(0, 150) + '...');
      
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
      console.log('[VoiceTokenFetcher] Response status:', response.status);
      
      // Clone the response before reading the text to avoid consuming the stream
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      console.log('[VoiceTokenFetcher] Response text length:', responseText.length);
      console.log('[VoiceTokenFetcher] Response text preview:', responseText.substring(0, 150) + '...');
      
      if (!response.ok) {
        // Check if we should retry
        if (retryCount < this.MAX_RETRIES) {
          console.warn(`[VoiceTokenFetcher] Request failed (${response.status}), retrying in ${this.RETRY_DELAY}ms...`);
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount)));
          
          // Retry the request
          return await this.fetchVoiceToken(offer, retryCount + 1);
        }
        
        // Show toast with error details
        const truncatedResponse = responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '');
        toast.error(`Voice connection failed (${response.status})`, {
          description: truncatedResponse,
          duration: 5000
        });

        throw new Error(`VoiceConnectionError: Edge function returned error (${response.status}): ${responseText}`);
      }
      
      // Parse the response as JSON
      try {
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
        
        // Return the data directly, don't modify it
        return data as { answer: RTCSessionDescriptionInit; iceServers?: RTCIceServer[] };
      } catch (error) {
        console.error('[VoiceTokenFetcher] Error parsing JSON response:', error);
        console.error('[VoiceTokenFetcher] Raw response:', responseText);
        
        if (retryCount < this.MAX_RETRIES) {
          console.warn(`[VoiceTokenFetcher] JSON parse error, retrying in ${this.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount)));
          return await this.fetchVoiceToken(offer, retryCount + 1);
        }
        
        throw new Error(`VoiceConnectionError: Invalid JSON response from server: ${error.message}`);
      }
    } catch (error) {
      console.error('[VoiceTokenFetcher] Error fetching voice token:', error);
      
      // Retry on network errors
      if (error.name === 'TypeError' && retryCount < this.MAX_RETRIES) {
        console.warn(`[VoiceTokenFetcher] Network error, retrying in ${this.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount)));
        return await this.fetchVoiceToken(offer, retryCount + 1);
      }
      
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
