export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }
  const { token, widget } = body;

  if (!token) return json({ success: false, error: 'No token' }, 400);

  const secretMap = {
    widget1: env.TURNSTILE_SECRET_1,
    widget2: env.TURNSTILE_SECRET_2,
    widget3: env.TURNSTILE_SECRET_3,
    widget4: env.TURNSTILE_SECRET_4, // Offlabel widget's secret
  };
  const secret = secretMap[widget];
  if (!secret) return json({ success: false, error: 'Unknown widget' }, 400);

  const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    }),
  });
  const cfData = await cfResponse.json();

  // Optional: reject tokens issued for a different hostname
  const expectedHost = new URL(request.url).hostname;
  if (cfData.success && cfData.hostname && cfData.hostname !== expectedHost) {
    cfData.success = false;
    cfData['error-codes'] = [...(cfData['error-codes'] || []), 'hostname-mismatch'];
  }

  console.log(`Turnstile response for ${widget}:`, cfData);
  return json(cfData);
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
