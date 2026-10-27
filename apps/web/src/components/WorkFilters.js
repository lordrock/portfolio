'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export default function WorkFilters({ pillars = [], subcategories = [], technologies = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') || '');
  const timer = useRef(null);

  const pillar = params.get('pillar') || '';
  const sub = params.get('sub') || '';
  const tech = params.get('tech') || '';
  const sort = params.get('sort') || '';

  function update(patch) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('page');
    startTransition(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  function onSearch(v) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: v.trim() }), 350);
  }

  const activePillar = pillars.find((p) => p.slug === pillar);
  const subs = subcategories.filter((s) => !activePillar || String(s.parent) === String(activePillar._id));
  const hasFilters = pillar || sub || tech || q;

  return (
    <div className="filters" aria-busy={pending}>
      <div className="filters-row">
        <div className="pillar-tabs" role="group" aria-label="Filter by area">
          <button type="button" aria-pressed={!pillar} onClick={() => update({ pillar: '', sub: '' })}>All work</button>
          {pillars.map((p) => (
            <button key={p._id} type="button" data-pillar={p.slug} aria-pressed={pillar === p.slug} onClick={() => update({ pillar: p.slug, sub: '' })}>
              <span className="pillar-dot" aria-hidden="true" />{p.name}<span className="tab-count">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filters-row filters-tools">
        <div className="field-inline">
          <label htmlFor="work-search" className="sr-only">Search work</label>
          <input id="work-search" type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search projects, tools, topics" />
        </div>
        {technologies.length ? (
          <div className="field-inline">
            <label htmlFor="work-tech">Technology</label>
            <select id="work-tech" value={tech} onChange={(e) => update({ tech: e.target.value })}>
              <option value="">Any</option>
              {technologies.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
            </select>
          </div>
        ) : null}
        <div className="field-inline">
          <label htmlFor="work-sort">Sort</label>
          <select id="work-sort" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="">Featured first</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A to Z</option>
          </select>
        </div>
      </div>

      {subs.length ? (
        <div className="chips" role="group" aria-label="Filter by subcategory">
          {subs.map((s) => (
            <button key={s._id} type="button" className="chip" aria-pressed={sub === s.slug} onClick={() => update({ sub: sub === s.slug ? '' : s.slug })}>
              {s.name}
            </button>
          ))}
        </div>
      ) : null}

      {hasFilters ? (
        <button type="button" className="link-button" onClick={() => { setQ(''); startTransition(() => router.replace(pathname, { scroll: false })); }}>
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
