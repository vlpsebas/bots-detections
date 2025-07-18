export async function onRequest(context) {
  const headers = context.request.headers;

  const cfHeaders = {
    botScore: headers.get('cf-botscore') || null,
    wafAction: headers.get('cf-waf-action') || null,
    wafScore: headers.get('cf-waf-score') || null,
    referer: headers.get('referer') || null,
    origin: headers.get('origin') || null,
    userAgent: headers.get('user-agent') || null,
    asn: headers.get('cf-asn') || null,
    ja3: headers.get('cf-ja3') || null,
    ja4: headers.get('cf-ja4') || null,
    botManagementDetectionId: headers.get('cf-bot-management-detection-id') || null,
    cfRay: headers.get('cf-ray') || null,
    xForwardedFor: headers.get('x-forwarded-for') || null,
    xClientIP: headers.get('x-client-ip') || null,
    cfConnectingIP: headers.get('cf-connecting-ip') || null,
    cfVisitor: headers.get('cf-visitor') || null,
    cfRequestUUID: headers.get('cf-request-uuid') || null
  };

  return new Response(JSON.stringify(cfHeaders), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET'
    },
  });
}

export async function onRequest(context) {
  const headers = context.request.headers;

  // Log headers for debugging
  const allHeaders = {};
  for (const [key, value] of headers.entries()) {
    allHeaders[key] = value;
  }

  console.log("Headers received:", JSON.stringify(allHeaders, null, 2));

  return new Response(JSON.stringify(allHeaders, null, 2), {
    headers: {
      'content-type': 'application/json',
    }
  });
}
