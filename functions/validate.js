export async function onRequestPost({ request, env }) {
  const { token, widget } = await request.json();

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'No token' }), { status: 400 });
  }

  const secret = env.TURNSTILE_SECRET; // your Turnstile secret key

  // Verify token with Turnstile API
  const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secret}&response=${token}`
  });

  const cfData = await cfResponse.json();

  // Log in Pages Function logs (optional, for debugging)
  console.log(`Turnstile response for ${widget}:`, cfData);

  // Return verification result to frontend
  return new Response(JSON.stringify(cfData), {
    headers: { 'Content-Type': 'application/json' }
  });
}
