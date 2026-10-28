// Browser-side client for the admin API. Same-origin (/api/v1 is proxied by Next), so the httpOnly session
// cookie travels automatically; the CSRF token is read from its companion cookie and sent as a header.
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const csrf = () => {
  const m = typeof document !== 'undefined' && document.cookie.match(/(?:^|; )pf_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf();
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const request = () => fetch(`/api/v1/admin${path}`, { method, headers, body: payload, credentials: 'same-origin', cache: 'no-store' });
  let res;
  try {
    res = await request();
    // Read-only admin requests are safe to replay once when a sleeping backend
    // or a brief Netlify-to-Render interruption returns a gateway/service error.
    if (method === 'GET' && [502, 503, 504].includes(res.status)) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      res = await request();
    }
  } catch (error) {
    if (method !== 'GET') throw error;
    await new Promise((resolve) => setTimeout(resolve, 900));
    res = await request();
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login') && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin:unauthorized'));
    }
    const detail = data?.details?.length ? `${data.error}: ${data.details.map((d) => `${d.path} ${d.message}`).join('; ')}` : data?.error;
    throw new ApiError(detail || `Request failed (${res.status})`, res.status, data?.details);
  }
  return data;
}

export const setIn = (obj, path, value) => {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else {
      cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) };
      cur = cur[k];
    }
  });
  return clone;
};
export const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
