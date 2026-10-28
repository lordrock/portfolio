import Link from 'next/link';
import { apiGet, img } from '@/lib/api';

export const revalidate = 60;
export const metadata = {
  title: 'Articles',
  description: 'Thoughts, practical guides, and lessons from design, development, growth, and Web3.',
  alternates: { canonical: '/articles' },
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

export default async function Articles() {
  const res = await apiGet('/articles');
  const items = res?.items || [];
  return (
    <div className="container page">
      <header className="page-head">
        <h1>Articles</h1>
        <p className="page-lede">Thoughts, practical guides, and lessons from design, development, growth, and Web3.</p>
      </header>
      {items.length ? (
        <ul className="article-list">
          {items.map((a) => (
            <li key={a._id}>
              <Link href={`/articles/${a.slug}`}>
                <div>
                  <p className="muted">{fmt(a.publishedAt)}</p>
                  <h2>{a.title}</h2>
                  <p>{a.excerpt}</p>
                </div>
                {a.cover?.url ? <img src={img(a.cover.url, 480)} alt="" loading="lazy" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty"><h2>Nothing published yet</h2><p>Articles will appear here once they’re ready.</p></div>
      )}
    </div>
  );
}
