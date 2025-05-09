
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from './config.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body & validate
    let offer;
    try {
      const body = await req.json();
      offer = body.offer;
      console.log("[realtime-token] Received offer:", offer?.type);
    } catch (err) {
      console.error("[realtime-token] JSON parse error:", err);
      return Response.json({ error: 'invalid JSON in request body' }, { status: 400, headers: corsHeaders });
    }

    if (!offer?.sdp || !offer?.type) {
      console.error("[realtime-token] Missing offer details:", offer);
      return Response.json({ error: 'missing or invalid offer' }, { status: 400, headers: corsHeaders });
    }

    // ADD dummy test response for safe testing
    if (offer?.sdp === 'dummy-sdp-for-testing') {
      console.log("[realtime-token] Returning test response for dummy sdp");
      return Response.json({
        answer: {
          type: "answer",
          sdp: "v=0\no=- 0 0 IN IP4 127.0.0.1\ns=Dummy\nt=0 0\nm=audio 9 UDP/TLS/RTP/SAVPF 111\nc=IN IP4 0.0.0.0\na=rtpmap:111 opus/48000/2"
        },
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      }, { headers: corsHeaders });
    }

    // 1) Secrets / config
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error("[realtime-token] OPENAI_API_KEY not set");
      return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500, headers: corsHeaders });
    }
    
    // Using the CORRECT OpenAI Realtime API endpoints with latest model
    const OPENAI_BASE = 'https://api.openai.com/v1/realtime';
    
    // PERFORMANCE: Use the latest model for best voice quality
    const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

    // 2) Create realtime session with optimized parameters
    console.log("[realtime-token] Creating session with API key:", apiKey ? "Present (hidden)" : "Missing");
    console.log("[realtime-token] Using model:", MODEL);
    const sessionRes = await fetch(`${OPENAI_BASE}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modalities: ['audio', 'text'], 
        model: MODEL,
        // PERFORMANCE: Add voice parameter directly in session creation
        voice: 'alloy', // This is the default voice
        // PERFORMANCE: Add low latency parameters
        low_latency: true  // Request low latency processing from OpenAI
      })
    });
    
    if (!sessionRes.ok) {
      const body = await sessionRes.text();
      console.error(`[realtime-token] session create failed: ${sessionRes.status}`, body);
      return Response.json(
        { error: 'session create failed', status: sessionRes.status, body },
        { status: sessionRes.status, headers: corsHeaders }
      );
    }
    
    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;
    console.log('[realtime-token] session created with ID:', sessionId);

    // PERFORMANCE: Use model parameter in URL and add session ID
    console.log(`[realtime-token] Using direct SDP exchange at URL: ${OPENAI_BASE}?model=${MODEL}&session_id=${sessionId}`);
    const exchangeRes = await fetch(`${OPENAI_BASE}?model=${MODEL}&session_id=${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
        // PERFORMANCE: Add additional headers for better debugging
        'X-Request-ID': `req_${Date.now()}`,
        'X-Session-ID': sessionId
      },
      body: offer.sdp
    });
    
    // Add enhanced logging
    console.log('[realtime-token] OpenAI SDP exchange status:', exchangeRes.status);
    const responseBody = await exchangeRes.clone().text();
    
    // Return OpenAI's response directly if not successful, but WITH CORS headers
    if (!exchangeRes.ok) {
      console.error('[realtime-token] SDP exchange failed:', exchangeRes.status, responseBody);
      return new Response(responseBody, { 
        status: exchangeRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // If we get a successful response, it's the SDP answer directly
    const answer = {
      type: 'answer',
      sdp: responseBody
    };
    
    // ENHANCED: Provide a comprehensive set of STUN/TURN servers
    // This improves NAT traversal capabilities
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // Add more public STUN servers for better connectivity
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.stunprotocol.org:3478" }
    ];
    
    console.log("[realtime-token] SDP exchange successful");
    console.log("[realtime-token] READY");

    // 4) Success - return the answer and ice servers
    return Response.json({ answer, iceServers }, { headers: corsHeaders });
  } catch (err) {
    console.error("[realtime-token] Unexpected error:", err);
    return Response.json({ error: err.message ?? 'unknown' }, { status: 500, headers: corsHeaders });
  }
});
