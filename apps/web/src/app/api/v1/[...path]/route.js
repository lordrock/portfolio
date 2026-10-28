const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

const REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
];

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxy(request, context) {
  try {
    const { path = [] } = await context.params;
    const pathname = path.map((part) => encodeURIComponent(part)).join('/');
    const target = new URL(`${API_URL}/api/v1/${pathname}`);
    target.search = request.nextUrl.search;

    const headers = new Headers();
    for (const name of REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('x-forwarded-host', request.headers.get('host') || '');
    headers.set('x-forwarded-proto', 'https');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== 'set-cookie') {
        responseHeaders.append(name, value);
      }
    });

    // Node's fetch keeps multiple Set-Cookie values separate through this API.
    // This is essential because login sets both the httpOnly session cookie and
    // the readable CSRF companion cookie on the Netlify origin.
    const cookies = upstream.headers.getSetCookie?.() || [];
    for (const cookie of cookies) responseHeaders.append('set-cookie', cookie);

    // Authentication and CMS responses must never be stored by Netlify's edge
    // cache. A cached anonymous 401 can otherwise be replayed immediately after
    // a successful login and make the UI appear to bounce back to /admin/login.
    if (pathname.startsWith('admin/')) {
      responseHeaders.set('cache-control', 'private, no-store, max-age=0');
      responseHeaders.set('pragma', 'no-cache');
      responseHeaders.append('vary', 'Cookie');
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[api-proxy] request failed', error);
    return Response.json({ error: 'Backend service is temporarily unavailable.' }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
