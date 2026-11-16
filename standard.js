// ============ CONFIG ============
const SITE_KEY = "YOUR_TURNSTILE_SITE_KEY"; // REPLACE: Dashboard > Turnstile > your widget > Site Key
const PASS_HOURS = 1;                       // REPLACE (optional): how long a visitor stays verified
const COOKIE_NAME = "ts_pass";              // optional: rename if you like
const VERIFY_PATH = "/__turnstile";         // optional: must not clash with a real path on your site
// Secrets are NOT set here. See setup step 3.
// ================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Visitor solved the challenge: verify token, set cookie, send them back
    if (url.pathname === VERIFY_PATH && request.method === "POST") {
      const form = await request.formData();
      const token = form.get("cf-turnstile-response");

      if (!(await verifyToken(token, request, env))) {
        return new Response("Verification failed. Please reload and try again.", { status: 403 });
      }

      const dest = new URL(form.get("to") || "/", url.origin);
      const location = dest.origin === url.origin ? dest.pathname + dest.search : "/";

      return new Response(null, {
        status: 303,
        headers: { Location: location, "Set-Cookie": await makeCookie(env) },
      });
    }

    // 2. Page load with no valid pass: show the challenge page
    const isPageLoad =
      request.method === "GET" && (request.headers.get("Accept") || "").includes("text/html");

    if (isPageLoad && !(await hasValidCookie(request, env))) {
      return new Response(challengePage(url.pathname + url.search), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    // 3. Everything else goes to your origin unchanged
    return fetch(request);
  },
};

// ---------- Challenge page (implicit rendering) ----------
function challengePage(returnTo) {
  const safe = returnTo.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Just a moment...</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>body{font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}</style>
</head>
<body>
  <form id="gate" method="POST" action="${VERIFY_PATH}">
    <p>Checking your browser...</p>  <!-- REPLACE (optional): your own text/branding -->
    <input type="hidden" name="to" value="${safe}">
    <div class="cf-turnstile" data-sitekey="${SITE_KEY}" data-callback="onPass"></div>
  </form>
  <script>function onPass() { document.getElementById("gate").submit(); }</script>
</body>
</html>`;
}

// ---------- Server-side token check ----------
async function verifyToken(token, request, env) {
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || "",
    }),
  });
  const data = await res.json();
  return data.success === true;
}

// ---------- Signed cookie (stops people faking the pass) ----------
async function sign(value, env) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.COOKIE_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeCookie(env) {
  const expires = Date.now() + PASS_HOURS * 3600 * 1000;
  const sig = await sign(String(expires), env);
  return `${COOKIE_NAME}=${expires}.${sig}; Path=/; Max-Age=${PASS_HOURS * 3600}; HttpOnly; Secure; SameSite=Lax`;
}

async function hasValidCookie(request, env) {
  const match = (request.headers.get("Cookie") || "").match(
    new RegExp(`${COOKIE_NAME}=(\\d+)\\.([a-f0-9]+)`)
  );
  if (!match) return false;
  const [, expires, sig] = match;
  if (Number(expires) < Date.now()) return false;
  return sig === (await sign(expires, env));
}

