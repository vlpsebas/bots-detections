const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

// [CDATA] "ray_session_a1" -> ["ray", "session", "a1"]
const split = c => (typeof c === 'string' && c ? c.split('_') : null);

export async function onRequestPost({ request, env }) {
  const cf = request.cf || {};

  // [VISITOR] what Cloudflare knows about this request
  const visitor = {
    ts: new Date().toISOString(),
    ray: request.headers.get('cf-ray'),
    ip: request.headers.get('cf-connecting-ip'),
    userAgent: request.headers.get('user-agent'),
    country: cf.country, city: cf.city, asn: cf.asn, asOrganization: cf.asOrganization,
    colo: cf.colo, botManagement: cf.botManagement || null
  };
  const out = (entry, status) => { console.log(JSON.stringify(entry)); return json(entry, status); };

  let body;
  try { body = await request.json(); } catch { return out({ success: false, error: 'Invalid JSON', ...visitor }, 400); }
  const { token, widget, cdata } = body;

  // [CLIENT EVENTS] widget errors / expiry / timeouts -> log only
  if (body.type === 'client-event') {
    return out({ kind: 'client_event', widget, event: body.event, code: body.code, cdata, cdataParts: split(cdata), ...visitor });
  }

  if (!token) return out({ success: false, decision: 'challenged', error: 'No token', widget, ...visitor }, 400);

  // [CORE] secret per widget (unchanged)
  const secret = {
    widget1: env.TURNSTILE_SECRET_1,
    widget2: env.TURNSTILE_SECRET_2,
    widget3: env.TURNSTILE_SECRET_3,
    widget4: env.TURNSTILE_SECRET_4, // Offlabel widget's secret
  }[widget];
  if (!secret) return out({ success: false, decision: 'config_error', error: 'Unknown widget', widget, ...visitor }, 400);

  // [CORE] Siteverify
  const t0 = Date.now();
  const sv = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: visitor.ip || '' }),
  }).then(r => r.json()).catch(e => ({ success: false, 'error-codes': ['siteverify-unreachable'], detail: String(e) }));

  // [CORE] reject tokens for another hostname (unchanged)
  const host = new URL(request.url).hostname;
  if (sv.success && sv.hostname && sv.hostname !== host) {
    sv.success = false;
    sv['error-codes'] = [...(sv['error-codes'] || []), 'hostname-mismatch'];
  }

  // [VERIFY] original Siteverify fields stay top-level (widgets 2-4 keep working) + checks
  return out({
    ...sv,
    kind: 'siteverify',
    decision: sv.success ? 'passed' : 'siteverify_failed',
    widget,
    cdataSentParts: split(cdata),
    cdataReturnedParts: split(sv.cdata),
    cdataMatch: !!cdata && sv.cdata === cdata,
    actionMatch: sv.action === widget,
    hostnameMatch: sv.hostname === host,
    errorCodes: sv['error-codes'] || [],
    siteverifyMs: Date.now() - t0,
    ...visitor
  });
}
