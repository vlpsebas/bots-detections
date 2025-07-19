export default {
  async fetch(request) {
    const cf = request.cf || {};
    const headers = request.headers;

    const result = {
      botScore: cf.botManagement?.score ?? null,
      verifiedBot: cf.botManagement?.verifiedBot ?? null,
      ja3: cf.ja3 || null,
      country: cf.country || null,

      acceptLanguage: headers.get("accept-language") || null,
      cookie: headers.get("cookie") || null,
      secChUa: headers.get("sec-ch-ua") || null,
      secFetchSite: headers.get("sec-fetch-site") || null
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
