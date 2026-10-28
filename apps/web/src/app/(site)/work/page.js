import Link from 'next/link';
import { apiGet, getSite } from '@/lib/api';
import WorkCard from '@/components/WorkCard';
import WorkFilters from '@/components/WorkFilters';
import { Suspense } from 'react';

export const metadata = { title: 'Work', description: 'Design, software, marketing and Web3 projects, filterable by area, subcategory and technology.', alternates: { canonical: '/work' } };

const first = (v) => (Array.isArray(v) ? v[0] : v) || '';

export default async function WorkHub({ searchParams }) {
  const query = await searchParams;
  const sp = Object.fromEntries(Object.entries(query || {}).map(([k, v]) => [k, first(v)]));
  const qs = new URLSearchParams();
  ['pillar', 'sub', 'tech', 'q', 'sort', 'page'].forEach((k) => sp[k] && qs.set(k, String(sp[k]).slice(0, 80)));
  qs.set('limit', '12');

  const [site, list, facets] = await Promise.all([getSite(), apiGet(`/works?${qs}`, { revalidate: 30 }), apiGet('/works/facets')]);
  const items = list?.items || [];
  const total = list?.total || 0;
  const page = list?.page || 1;
  const pages = Math.max(1, Math.ceil(total / (list?.limit || 12)));

  const pageHref = (n) => {
    const next = new URLSearchParams(qs);
    next.delete('limit');
    if (n > 1) next.set('page', String(n)); else next.delete('page');
    return `/work${next.toString() ? `?${next}` : ''}`;
  };

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Work</h1>
        <p className="page-lede">Projects across design, software, marketing and Web3. Filter by area, narrow by subcategory or tool, or search.</p>
      </header>

      <Suspense fallback={null}>
        <WorkFilters pillars={site.pillars} subcategories={site.subcategories} technologies={facets?.technologies || []} />
      </Suspense>

      <p className="result-count" role="status" aria-live="polite">{total} {total === 1 ? 'project' : 'projects'}</p>

      {items.length ? (
        <div className="work-grid">
          {items.map((w, i) => <WorkCard key={w._id} work={w} priority={i < 3} level={2} />)}
        </div>
      ) : (
        <div className="empty">
          <h2>No projects match</h2>
          <p>Try removing a filter or searching for a broader term.</p>
          <Link href="/work" className="btn btn-quiet">Clear filters</Link>
        </div>
      )}

      {pages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 ? <Link href={pageHref(page - 1)} rel="prev">Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={pageHref(page + 1)} rel="next">Next</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
