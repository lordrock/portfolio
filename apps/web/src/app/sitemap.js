import { apiGet, SITE_URL } from '@/lib/api';

export const revalidate = 60;

export default async function sitemap() {
  const [works, articles, site] = await Promise.all([apiGet('/works/slugs', { revalidate: 60 }), apiGet('/articles', { revalidate: 60 }), apiGet('/site')]);
  const now = new Date();
  const pages = ['', '/about', '/work', '/services', '/contact', '/resume', '/privacy'].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, priority: p === '' ? 1 : 0.7 }));
  if (site?.hasArticles) pages.push({ url: `${SITE_URL}/insights`, lastModified: now, priority: 0.6 });
  return [
    ...pages,
    ...(works?.items || []).map((w) => ({ url: `${SITE_URL}/work/${w.slug}`, lastModified: w.updatedAt, priority: 0.8 })),
    ...(articles?.items || []).map((a) => ({ url: `${SITE_URL}/insights/${a.slug}`, lastModified: a.updatedAt, priority: 0.6 })),
  ];
}
