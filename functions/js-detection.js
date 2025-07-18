export async function onRequest(context) {
  const { request } = context;
  const headers = request.headers;
  const cf = request.cf || {}; // Zone-scoped fields

  // Optional: Log all headers for debugging
  const allHeaders = {};
  for (const [key, value] of headers.entries()) {
    allHeaders[key] = value;
  }
  console.log("Request headers received:", JSON.stringify(allHeaders, null, 2));

  const result = {
    // 🌍 Zone-scoped (request.cf) values
    asn: cf.asn || null,
    colo: cf.colo || null,
    city: cf.city || null,
    region: cf.region || null,
    country: cf.country || null,
    tlsCipher: cf.tlsCipher || null,
    ja3: cf.ja3 || null,

    botManagement: {
      score: cf.botManagement?.score ?? null,
      corporateProxy: cf.botManagement?.corporateProxy ?? null,
      verifiedBot: cf.botManagement?.verifiedBot ?? null
    },

    // 📥 Request headers
    userAgent: headers.get('user-agent') || null,
    referer: headers.get('referer') || null,
    origin: headers.get('origin') || null,

    wafAction: headers.get('cf-waf-action') || null,
    wafScore: headers.get('cf-waf-score') || null,
    botManagementDetectionId: headers.get('cf-bot-management-detection-id') || null,
    cfRay: headers.get('cf-ray') || null,
    xForwardedFor: headers.get('x-forwarded-for') || null,
    xClientIP: headers.get('x-client-ip') || null,
    cfConnectingIP: headers.get('cf-connecting-ip') || null,
    cfVisitor: headers.get('cf-visitor') || null,
    cfRequestUUID: headers.get('cf-request-uuid') || null
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET'
    },
  });
}
