import { notFound } from 'next/navigation';
import { apiGet, img, SITE_URL } from '@/lib/api';
import Markdown from '@/components/Markdown';
import BackLink from '@/components/BackLink';

export const revalidate = 60;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await apiGet(`/articles/${encodeURIComponent(slug)}`);
  if (!data?.article) return { title: 'Articles' };
  const a = data.article;
  const title = a.seo?.title || a.title;
  const description = a.seo?.description || a.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/articles/${a.slug}`,
      publishedTime: a.publishedAt,
      images: a.cover?.url ? [{ url: a.cover.url.startsWith('/') ? SITE_URL + a.cover.url : img(a.cover.url, 1200) }] : undefined,
    },
  };
}

export default async function Article({ params }) {
  const { slug } = await params;
  const data = await apiGet(`/articles/${encodeURIComponent(slug)}`);
  if (!data || data.__notFound) notFound();
  const a = data.article;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.publishedAt, dateModified: a.updatedAt, description: a.excerpt };
  return (
    <article className="container page article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="detail-nav">
        <BackLink fallback="/articles">Back to articles</BackLink>
      </div>
      <header className="page-head"><h1>{a.title}</h1><p className="muted">{fmt(a.publishedAt)}</p></header>
      {a.cover?.url ? <figure className="work-cover"><img src={img(a.cover.url, 1400)} alt={a.cover.alt || ''} /></figure> : null}
      <Markdown className="prose-lg article-body">{a.body}</Markdown>
    </article>
  );
}
