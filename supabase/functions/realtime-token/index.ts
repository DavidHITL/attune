
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  try {
    // 0) Parse body & validate
    const { offer } = await req.json();
    if (!offer?.sdp || !offer?.type) {
      return Response.json({ error: 'missing offer' }, { status: 400 });
    }

    // 1) Secrets / config
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
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
        { status: sessionRes.status }
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
        { status: sdpRes.status }
      );
    }
    const { answer, ice_servers } = await sdpRes.json();

    // 4) Success
    return Response.json({ answer, iceServers: ice_servers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message ?? 'unknown' }, { status: 500 });
  }
});
