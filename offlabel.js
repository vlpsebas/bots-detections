// ============ OFFLABEL CONFIG ============
const SITE_KEY = "YOUR_OFFLABEL_SITE_KEY";  // REPLACE: sitekey of the widget created with "offlabel": true
const LOGO_URL = "YOUR_PUBLIC_LOGO_URL";    // REPLACE: public R2 URL (custom domain or r2.dev), NOT *.r2.cloudflarestorage.com
const BRAND_NAME = "Your Company";          // REPLACE: used for logo alt text and page title
const PASS_HOURS = 1;                       // REPLACE (optional): how long a visitor stays verified
const COOKIE_NAME = "ts_pass";              // optional: rename if you like
const VERIFY_PATH = "/__turnstile";         // optional: must not clash with a real path on your site
// Secrets are NOT set here. TURNSTILE_SECRET must be the secret of the SAME offlabel widget.
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

// ---------- HTML escaping ----------
const esc = (s) => String(s).replace(/[&"'<>]/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- Challenge page (implicit rendering, offlabel widget + custom logo) ----------
function challengePage(returnTo) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(BRAND_NAME)} - Security check</title>
  <link rel="preconnect" href="https://challenges.cloudflare.com">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    body{font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8f9fa}
    .card{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:2rem 2.5rem;text-align:center;max-width:420px;width:100%}
    .logo{height:56px;width:auto;margin-bottom:1rem}
    .widget{display:flex;justify-content:center;min-height:65px;margin:1rem 0}
    .note{font-size:.75rem;color:#888}
    .note a{color:inherit}
  </style>
</head>
<body>
  <form id="gate" class="card" method="POST" action="${VERIFY_PATH}">
    <!-- CUSTOM LOGO (shown with the unbranded widget) -->
    <img class="logo" src="${esc(LOGO_URL)}" alt="${esc(BRAND_NAME)} logo">
    <p>Checking your browser...</p>  <!-- REPLACE (optional): your own text -->
    <input type="hidden" name="to" value="${esc(returnTo)}">

    <!-- OFFLABEL WIDGET: branding removal comes from the widget setting (offlabel:true) -->
    <div class="widget">
      <div class="cf-turnstile"
           data-sitekey="${SITE_KEY}"
           data-callback="onPass"
           data-theme="light"
           data-offlabel-show-privacy="true"
           data-offlabel-show-help="true"></div>
    </div>

    <!-- Required for offlabel: reference Cloudflare's Turnstile Privacy Addendum
         (either here, or in your own privacy policy) -->
    <p class="note">Protected by Turnstile.
      <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener">Privacy</a></p>
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

