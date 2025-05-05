
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from './config.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 0) Parse body & validate
    const { offer } = await req.json();
    if (!offer?.sdp || !offer?.type) {
      return Response.json({ error: 'missing offer' }, { status: 400, headers: corsHeaders });
    }

    // ADD dummy test response for safe testing
    if (offer?.sdp === 'dummy-sdp-for-testing') {
      return Response.json({
        answer: "v=0\\no=- 0 0 IN IP4 127.0.0.1\\ns=Dummy\\nt=0 0\\nm=audio 9 UDP/TLS/RTP/SAVPF 111\\nc=IN IP4 0.0.0.0\\na=rtpmap:111 opus/48000/2",
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      }, { headers: corsHeaders });
    }

    // 1) Secrets / config
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500, headers: corsHeaders });
    }
    const OPENAI_BASE = 'https://api.openai.com';

    // 2) Create realtime session
    const sessionRes = await fetch(`${OPENAI_BASE}/v1/realtime/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modalities: ['audio', 'text'], // adjust to your use-case
        model: 'gpt-4o-audio-preview-2024-12-17'
      })
    });
    if (!sessionRes.ok) {
      const body = await sessionRes.text();
      return Response.json(
        { error: 'session create failed', status: sessionRes.status, body },
        { status: sessionRes.status, headers: corsHeaders }
      );
    }
    const { id: session_id } = await sessionRes.json();
    console.log('[token] session', session_id);

    // 3) Exchange SDP
    const sdpRes = await fetch(
      `${OPENAI_BASE}/v1/realtime/sessions/${session_id}/sdp:exchange`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ offer })
      }
    );
    if (!sdpRes.ok) {
      const body = await sdpRes.text();
      return Response.json(
        { error: 'sdp exchange failed', status: sdpRes.status, body },
        { status: sdpRes.status, headers: corsHeaders }
      );
    }
    const { answer, ice_servers } = await sdpRes.json();

    // 4) Success
    return Response.json({ answer, iceServers: ice_servers }, { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message ?? 'unknown' }, { status: 500, headers: corsHeaders });
  }
});
