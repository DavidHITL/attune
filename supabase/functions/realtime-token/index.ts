
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
    // Base URL for all realtime API operations
    const OPENAI_BASE = 'https://api.openai.com/v1/realtime';

    // 2) Create realtime session
    console.log("[realtime-token] Creating session with API key:", apiKey ? "Present (hidden)" : "Missing");
    console.log("[realtime-token] Using model: gpt-4o-realtime-preview-2024-12-17");
    const sessionRes = await fetch(`${OPENAI_BASE}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modalities: ['audio', 'text'], // adjust to your use-case
        model: 'gpt-4o-realtime-preview-2024-12-17' // Using the correct model name
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
    
    const { id: sessionId } = await sessionRes.json();
    console.log('[token] session', sessionId);

    // 3) Exchange SDP with updated URL - CRITICAL FIX: Use the correct SDP exchange endpoint format
    // The OpenAI API expects /realtime/exchanges/sdp not /realtime/sessions/{sessionId}/sdp-exchange
    console.log("[realtime-token] Exchanging SDP with session:", sessionId);
    const exchangeRes = await fetch(
      `${OPENAI_BASE}/exchanges/sdp`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          session_id: sessionId,
          offer 
        })
      }
    );
    
    // Add enhanced logging
    console.log('[realtime-token] OpenAI status', exchangeRes.status);
    console.log('[realtime-token] OpenAI body', await exchangeRes.clone().text());
    
    // Return OpenAI's response directly if not successful, but now WITH CORS headers
    if (!exchangeRes.ok) {
      return new Response(await exchangeRes.text(), { 
        status: exchangeRes.status,
        headers: corsHeaders 
      });
    }
    
    const { answer, ice_servers } = await exchangeRes.json();
    console.log("[realtime-token] SDP exchange successful");
    console.log("[realtime-token] READY");

    // 4) Success
    return Response.json({ answer, iceServers: ice_servers }, { headers: corsHeaders });
  } catch (err) {
    console.error("[realtime-token] Unexpected error:", err);
    return Response.json({ error: err.message ?? 'unknown' }, { status: 500, headers: corsHeaders });
  }
});
