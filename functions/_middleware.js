export async function onRequest({ request, next }) {
  const response = await next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  const ray = (request.headers.get('cf-ray') || '').replace(/[^A-Za-z0-9-]/g, '');
  return new HTMLRewriter()
    .on('head', { element(el) { el.append(`<meta name="cf-ray" content="${ray}">`, { html: true }); } })
    .transform(response);
}
