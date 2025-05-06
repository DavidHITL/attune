
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
    
    // Using the CORRECT OpenAI Realtime API endpoints
    const OPENAI_BASE = 'https://api.openai.com/v1/realtime';
    const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

    // 2) Create realtime session
    console.log("[realtime-token] Creating session with API key:", apiKey ? "Present (hidden)" : "Missing");
    console.log("[realtime-token] Using model:", MODEL);
    const sessionRes = await fetch(`${OPENAI_BASE}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modalities: ['audio', 'text'], // adjust to your use-case
        model: MODEL // Using the correct model name
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

    // CRITICAL FIX: Add model parameter to the URL when making the SDP exchange request
    console.log(`[realtime-token] Using direct SDP exchange at URL: ${OPENAI_BASE}?model=${MODEL}`);
    const exchangeRes = await fetch(`${OPENAI_BASE}?model=${MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp
    });
    
    // Add enhanced logging
    console.log('[realtime-token] OpenAI SDP exchange status:', exchangeRes.status);
    const responseBody = await exchangeRes.clone().text();
    console.log('[realtime-token] OpenAI response body:', responseBody);
    
    // Return OpenAI's response directly if not successful, but WITH CORS headers
    if (!exchangeRes.ok) {
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
    
    // IMPROVED: Always provide a set of STUN/TURN servers
    // This improves NAT traversal capabilities
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }
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
