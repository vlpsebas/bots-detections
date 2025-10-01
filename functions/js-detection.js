export async function onRequest(context) {
  const { request, env } = context;
  const headers = request.headers;
  const cf = request.cf || {};

  const headerValue = (key) => headers.get(key) || null;

  // 🔁 Fetch additional data from the bound Worker
  let workerData = {};
  try {

    const workerRes = await env.WORKER.fetch(new Request("https://worker-detection.vsebas.workers.dev", {
      headers: request.headers,
      method: "GET",
    }));

    if (workerRes.ok) {
      workerData = await workerRes.json();
    } else {

      workerData = { error: `Worker responded with status ${workerRes.status}` };
    }
  } catch (err) {
    workerData = { error: `Worker fetch failed: ${err.message}` };
  }

  
  // 🌍 Cloudflare CF & header metadata
  const result = {
    asn: cf.asn || null,
    colo: cf.colo || null,
    city: cf.city || null,
    region: cf.region || null,
    country: cf.country || null,
    tlsCipher: cf.tlsCipher || null,


    // 🧠 Bot Management fields
    //botScore: headerValue('cf-bot-score') || cf.botManagement?.score || null,
    botManagement: {
      score: cf.botManagement?.score ?? null,
      corporateProxy: cf.botManagement?.corporateProxy ?? null,
      verifiedBot: cf.botManagement?.verifiedBot ?? null,
      botDetectionId: cf.botManagement?.detectionIds ?? null,
      verifiedBotCategory: cf.verifiedBotCategory ?? null
    },

    
    // ⚠️ Security and diagnostics
    wafAction: headerValue('cf-waf-action'),
    wafScore: headerValue('cf-waf-score'),
    botManagementDetectionId: headerValue('cf-bot-management-detection-id'),
    cfRay: headerValue('cf-ray'),
    cfVisitor: headerValue('cf-visitor'),
    cfRequestUUID: headerValue('cf-request-uuid'),
    ja3: headerValue('cf-ja3-hash') || null,
    ja4: headerValue('cf-ja4') || null,
    
    // 🧾 Network metadata
    userAgent: headerValue('user-agent'),
    referer: headerValue('referer'),
    origin: headerValue('origin'),
    xForwardedFor: headerValue('x-forwarded-for'),
    xClientIP: headerValue('x-client-ip'),
    cfConnectingIP: headerValue('cf-connecting-ip'),
  };


  // 🔀 Merge workerData into main result
  const merged = { ...result, ...workerData };

  return new Response(JSON.stringify(merged, null, 2), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET'
    },
  });
}
