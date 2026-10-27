import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { apiGet, img, SITE_URL } from '@/lib/api';
import Gallery from '@/components/Gallery';
import Markdown from '@/components/Markdown';
import Pillar from '@/components/Pillar';
import WorkCard from '@/components/WorkCard';
import BackLink from '@/components/BackLink';

const STATUS = { live: 'Live', 'in-development': 'In development', completed: 'Completed', archived: 'Archived' };
const WEB3_KIND = { community: 'Community activity', experiment: 'Experiment', production: 'Production software' };

async function load(slug, preview) {
  const qs = preview ? `?preview=${encodeURIComponent(preview)}` : '';
  return apiGet(`/works/${encodeURIComponent(slug)}${qs}`, preview ? { cache: 'no-store' } : { revalidate: 60 });
}

export async function generateMetadata({ params, searchParams }) {
  const preview = typeof searchParams?.preview === 'string' ? searchParams.preview : '';
  const data = await load(params.slug, preview);
  if (!data || data.__notFound || data.redirectTo) return { title: 'Work' };
  const w = data.work;
  const title = w.seo?.title || w.title;
  const description = w.seo?.description || w.summary;
  const ogImage = w.seo?.ogImage || w.cover?.url;
  const abs = (u) => (u?.startsWith('/') ? `${SITE_URL}${u}` : u);
  return {
    title,
    description,
    alternates: { canonical: `/work/${w.slug}` },
    robots: data.preview || w.visibility === 'unlisted' ? { index: false, follow: false } : undefined,
    openGraph: { title, description, type: 'article', url: `${SITE_URL}/work/${w.slug}`, images: ogImage ? [{ url: abs(img(ogImage, 1200)) }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function WorkDetail({ params, searchParams }) {
  const preview = typeof searchParams?.preview === 'string' ? searchParams.preview : '';
  const data = await load(params.slug, preview);
  if (!data || data.__notFound) notFound();
  if (data.redirectTo) permanentRedirect(`/work/${data.redirectTo}`);

  const { work: w, related, preview: isPreview } = data;
  const allPillars = [w.primaryCategory, ...(w.categories || [])].filter(Boolean);
  const metaRows = buildMeta(w);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: w.title,
    description: w.summary,
    url: `${SITE_URL}/work/${w.slug}`,
    image: w.cover?.url ? (w.cover.url.startsWith('/') ? SITE_URL + w.cover.url : w.cover.url) : undefined,
    datePublished: w.publishedAt || undefined,
    keywords: [...(w.tags || []), ...(w.technologies || [])].join(', ') || undefined,
  };

  return (
    <article className="container page work-detail" data-type={w.type}>
      {isPreview ? (
        <p className="preview-banner" role="status"><strong>Preview.</strong> This {w.status} item is not public. The link expires in 30 minutes.</p>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <div className="detail-nav">
        <BackLink fallback={w.primaryCategory ? `/work?pillar=${w.primaryCategory.slug}` : '/work'}>Back to work</BackLink>
        {w.primaryCategory ? <Link className="detail-nav-context" href={`/work?pillar=${w.primaryCategory.slug}`}>{w.primaryCategory.name}</Link> : null}
      </div>

      <header className="work-head">
        <div className="work-pillars">{allPillars.map((c) => <Pillar key={c._id} category={c} />)}</div>
        <h1>{w.title}</h1>
        <p className="page-lede">{w.summary}</p>
      </header>

      {metaRows.length ? (
        <dl className="meta-list">
          {metaRows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      ) : null}

      {w.type === 'development' ? <DevLinks d={w.development} /> : null}

      {w.cover?.url && w.type !== 'design' ? (
        <figure className="work-cover">
          <img src={img(w.cover.url, 1600)} alt={w.cover.alt || ''} width={w.cover.width || 1200} height={w.cover.height || 900} />
        </figure>
      ) : null}

      <div className="work-body">
        {w.type === 'design' ? <DesignBody w={w} /> : null}
        {w.type === 'development' ? <DevBody w={w} /> : null}
        {w.type === 'marketing' ? <MarketingBody w={w} /> : null}
        {w.type === 'web3' ? <Web3Body w={w} /> : null}
      </div>

      {related?.length ? (
        <section className="section" aria-labelledby="related-title">
          <h2 id="related-title" className="section-title">Related work</h2>
          <div className="work-grid">{related.map((r) => <WorkCard key={r._id} work={r} />)}</div>
        </section>
      ) : null}

      <aside className="inline-cta">
        <h2>Want something like this?</h2>
        <Link href={`/contact?pillar=${w.primaryCategory?.slug || ''}`} className="btn btn-primary">Start a conversation</Link>
      </aside>
    </article>
  );
}

function buildMeta(w) {
  const rows = [];
  if (w.dateLabel) rows.push(['Year', w.dateLabel]);
  if (w.projectStatus && w.projectStatus !== 'none') rows.push(['Status', STATUS[w.projectStatus]]);
  if (w.type === 'development') {
    if (w.development?.role) rows.push(['Role', w.development.role]);
    if (w.development?.stack?.length) rows.push(['Stack', w.development.stack.join(', ')]);
  }
  if (w.type === 'design') {
    if (w.design?.assetType) rows.push(['Type', w.design.assetType]);
    if (w.design?.client) rows.push(['Client', w.design.client]);
  }
  if (w.type === 'marketing') {
    if (w.marketing?.brand) rows.push(['Brand', w.marketing.brand]);
    if (w.marketing?.role) rows.push(['Role', w.marketing.role]);
    if (w.marketing?.duration) rows.push(['Duration', w.marketing.duration]);
    if (w.marketing?.platforms?.length) rows.push(['Channels', w.marketing.platforms.join(', ')]);
  }
  if (w.type === 'web3') {
    rows.push(['Kind', WEB3_KIND[w.web3?.kind] || 'Community activity']);
    if (w.web3?.program) rows.push(['Program', w.web3.program]);
    if (w.web3?.network) rows.push(['Network', w.web3.network]);
    if (w.web3?.role) rows.push(['Role', w.web3.role]);
  }
  if (w.subcategories?.length) rows.push(['Filed under', w.subcategories.map((s) => s.name).join(', ')]);
  return rows;
}

const Block = ({ title, children }) => (children ? <section className="block"><h2>{title}</h2>{children}</section> : null);
const Text = ({ children }) => (children ? <Markdown>{children}</Markdown> : null);

function ExtLink({ href, children, kind = 'quiet' }) {
  if (!href) return null;
  return <a className={`btn btn-${kind}`} href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}

function DevLinks({ d }) {
  if (!d?.liveUrl && !d?.repoUrl) return null;
  return (
    <p className="work-links">
      <ExtLink href={d.liveUrl} kind="primary">Visit live site</ExtLink>
      <ExtLink href={d.repoUrl}>View source code</ExtLink>
    </p>
  );
}

function DesignBody({ w }) {
  const images = w.gallery?.length ? w.gallery : w.cover ? [w.cover] : [];
  return (
    <>
      <Gallery images={images} layout="masonry" label={`${w.title} gallery`} />
      <Block title="Brief"><Text>{w.design?.brief}</Text></Block>
      <Block title="Process"><Text>{w.design?.process}</Text></Block>
      <Block title="Notes"><Text>{w.body}</Text></Block>
    </>
  );
}

function DevBody({ w }) {
  const d = w.development || {};
  return (
    <>
      <Block title="Overview"><Text>{w.body}</Text></Block>
      <div className="two-col">
        <Block title="The problem"><Text>{d.challenge}</Text></Block>
        <Block title="The solution"><Text>{d.solution}</Text></Block>
      </div>
      {d.features?.length ? <Block title="What it does"><ul className="bullets">{d.features.map((f) => <li key={f}>{f}</li>)}</ul></Block> : null}
      <Block title="Architecture"><Text>{d.architecture}</Text></Block>
      {w.gallery?.length ? <Block title="Screens"><Gallery images={w.gallery} layout="grid" label={`${w.title} screenshots`} /></Block> : null}
      <Block title="Outcome"><Text>{d.outcomes}</Text></Block>
      {w.technologies?.length ? <Block title="Built with"><ul className="inline-list">{w.technologies.map((t) => <li key={t}>{t}</li>)}</ul></Block> : null}
    </>
  );
}

function Evidence({ links }) {
  if (!links?.length) return null;
  return (
    <Block title="Evidence">
      <ul className="link-list">
        {links.map((l) => (<li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}<span className="sr-only"> (opens in a new tab)</span></a></li>))}
      </ul>
    </Block>
  );
}

function MarketingBody({ w }) {
  const m = w.marketing || {};
  const metrics = m.metrics || [];
  return (
    <>
      <Block title="Objective"><Text>{m.objective}</Text></Block>
      <Block title="Overview"><Text>{w.body}</Text></Block>
      {w.gallery?.length ? <Block title="Creative"><Gallery images={w.gallery} layout="grid" label={`${w.title} creative`} /></Block> : null}
      <Block title="Outcome"><Text>{m.outcome}</Text></Block>
      {metrics.length ? (
        <Block title="Measured results">
          <div className="metrics">
            {metrics.map((x) => (
              <div className="metric" key={x.label}>
                <p className="metric-value">{x.value}{x.unit ? <span> {x.unit}</span> : null}</p>
                <p className="metric-label">{x.label}</p>
                {x.context ? <p className="metric-context">{x.context}</p> : null}
                <p className="metric-source">{x.sourceType === 'verified' ? 'Verified' : 'Owner-reported'}{x.source ? `, ${x.source}` : ''}</p>
              </div>
            ))}
          </div>
        </Block>
      ) : null}
      <Evidence links={m.evidenceLinks} />
    </>
  );
}

function Web3Body({ w }) {
  const x = w.web3 || {};
  return (
    <>
      {x.disclaimer ? <p className="callout" role="note">{x.disclaimer}</p> : null}
      <Block title="Overview"><Text>{w.body}</Text></Block>
      {w.gallery?.length ? <Block title="Gallery"><Gallery images={w.gallery} layout="grid" label={`${w.title} gallery`} /></Block> : null}
      {x.contractAddress || x.explorerUrl || x.repoUrl ? (
        <Block title="On-chain details">
          <dl className="meta-list meta-list-stack">
            {x.contractAddress ? <div><dt>Contract</dt><dd><code>{x.contractAddress}</code> {x.contractVerified ? <span className="badge">Verified on explorer</span> : <span className="badge badge-muted">Not verified</span>}</dd></div> : null}
          </dl>
          <p className="work-links">
            <ExtLink href={x.explorerUrl}>Open in block explorer</ExtLink>
            <ExtLink href={x.repoUrl}>View repository</ExtLink>
          </p>
        </Block>
      ) : null}
      <Evidence links={x.evidenceLinks} />
    </>
  );
}
