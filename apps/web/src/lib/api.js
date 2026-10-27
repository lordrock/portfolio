// Server-side data access for public pages. Never throws: outages degrade to empty states.
const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function apiGet(path, { revalidate = 60, cache } = {}) {
  try {
    const options = process.env.NODE_ENV === 'development'
      ? { cache: 'no-store' }
      : cache
        ? { cache }
        : { next: { revalidate } };
    const res = await fetch(`${API_URL}/api/v1/public${path}`, options);
    if (res.status === 404) return { __notFound: true };
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const getSite = async () =>
  (await apiGet('/site')) || { profile: null, pillars: [], subcategories: [], hasArticles: false, siteUrl: SITE_URL, __offline: true };

/** Cloudinary: inject responsive, auto-format transforms. Other URLs pass through untouched. */
export function img(url, w) {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`);
  }
  return url;
}
export function srcSet(url, widths = [480, 800, 1200, 1800]) {
  if (!url || !url.includes('res.cloudinary.com')) return undefined;
  return widths.map((w) => `${img(url, w)} ${w}w`).join(', ');
}

export const pillarKey = (slug) => (['design', 'development', 'marketing', 'web3'].includes(slug) ? slug : 'development');
export const PILLAR_BLURB = {
  design: 'Identity, flyers, posters and visual systems.',
  development: 'Full-stack web and mobile applications, APIs and dashboards.',
  marketing: 'Campaigns, content and community-led growth.',
  web3: 'Ambassador programs, community and on-chain experiments.',
};
