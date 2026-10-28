import Link from 'next/link';
import { apiGet, getSite, img, pillarKey, PILLAR_BLURB, SITE_URL } from '@/lib/api';
import WorkCard from '@/components/WorkCard';
import Availability from '@/components/Availability';
import Markdown from '@/components/Markdown';
import { socialLinks } from '@/lib/socials';

export const revalidate = 60;

export async function generateMetadata() {
  const { profile } = await getSite();
  const title = profile?.name ? `${profile.name}: ${profile.headline || 'Design, development and growth'}` : 'Portfolio';
  const description = profile?.shortBio || 'I design, build, and grow digital experiences.';
  return { title: { absolute: title }, description, alternates: { canonical: '/' }, openGraph: { title, description, url: SITE_URL } };
}

export default async function Home() {
  const [site, featuredRes, testimonialsRes, ...pillarWorks] = await Promise.all([
    getSite(),
    apiGet('/works/featured?limit=5'),
    apiGet('/testimonials'),
    ...['design', 'development', 'marketing', 'web3'].map((s) => apiGet(`/works?pillar=${s}&limit=3`)),
  ]);
  // Older/stale API deployments may return a partial site payload. Keep the
  // public build available while the API deployment catches up.
  const profile = site?.profile || null;
  const pillars = Array.isArray(site?.pillars) ? site.pillars : [];
  const featured = featuredRes?.items || [];
  const testimonials = testimonialsRes?.items || [];
  const thumbs = Object.fromEntries(['design', 'development', 'marketing', 'web3'].map((s, i) => [s, pillarWorks[i]?.items || []]));
  const headline = profile?.headline || 'I design, build, and grow digital experiences.';
  const lines = splitHeadline(headline);

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile?.name,
    jobTitle: profile?.role || undefined,
    description: profile?.shortBio || undefined,
    url: SITE_URL,
    sameAs: socialLinks.map((social) => social.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />

      <section className="hero container" aria-labelledby="hero-title">
        <p className="hero-kicker"><span aria-hidden="true" /> Independent multidisciplinary practice</p>
        <h1 id="hero-title" className="hero-title">
          {lines.map((l, i) => (
            <span className="hero-line" key={l}><span style={{ animationDelay: `${120 + i * 110}ms` }}>{l}</span></span>
          ))}
        </h1>
        <div className="hero-side">
          <div>
            {profile?.shortBio ? <p className="hero-lede">{profile.shortBio}</p> : null}
            <Availability availability={profile?.availability} />
          </div>
          <div className="hero-actions">
            <Link href="/work" className="btn btn-primary">See the work <span aria-hidden="true">↗</span></Link>
            <Link href="/contact" className="btn btn-quiet">Start a conversation</Link>
          </div>
        </div>
      </section>

      <section className="container pillar-index" aria-label="Areas of work">
        <ul>
          {pillars.map((p) => {
            const key = pillarKey(p.slug);
            const items = thumbs[key] || [];
            return (
              <li key={p._id} data-pillar={key}>
                <Link href={`/work?pillar=${p.slug}`} className="pillar-row">
                  <span className="pillar-row-name">{p.name}</span>
                  <span className="pillar-row-blurb">{p.description || PILLAR_BLURB[key]}</span>
                  <span className="pillar-row-thumbs" aria-hidden="true">
                    {items.slice(0, 3).map((w) => <img key={w._id} src={img(w.cover?.url, 240)} alt="" loading="lazy" />)}
                  </span>
                  <span className="pillar-row-count">{p.count} {p.count === 1 ? 'project' : 'projects'}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {featured.length ? (
        <section className="section container" aria-labelledby="featured-title">
          <div className="section-head">
            <h2 id="featured-title">Selected work</h2>
            <Link href="/work" className="text-link">All work</Link>
          </div>
          <div className="featured-grid">
            {featured.map((w, i) => <WorkCard key={w._id} work={w} size={i === 0 ? 'lg' : 'md'} priority={i === 0} />)}
          </div>
        </section>
      ) : null}

      {profile ? (
        <section className="section container about-teaser" aria-labelledby="about-title">
          <div className="about-teaser-copy">
            <h2 id="about-title">How I work</h2>
            <ul className="approach">
              {(profile.approach || []).map((a) => (
                <li key={a.title}><h3>{a.title}</h3><p>{a.text}</p></li>
              ))}
            </ul>
            <Link href="/about" className="text-link">More about me</Link>
          </div>
          {profile.photo?.url ? (
            <img className="portrait" src={img(profile.photo.url, 700)} alt={profile.photo.alt || `Portrait of ${profile.name}`} loading="lazy" width="700" height="875" />
          ) : null}
        </section>
      ) : null}

      {testimonials.length ? (
        <section className="section container" aria-labelledby="kind-words">
          <h2 id="kind-words" className="section-title">What people say</h2>
          <ul className="quotes">
            {testimonials.slice(0, 3).map((t) => (
              <li key={t._id}>
                <blockquote><p>{t.quote}</p></blockquote>
                <p className="quote-by"><strong>{t.authorName}</strong>{t.authorRole || t.company ? <span>{[t.authorRole, t.company].filter(Boolean).join(', ')}</span> : null}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cta-band" aria-labelledby="cta-title">
        <div className="container cta-inner">
          <h2 id="cta-title">Have something worth building?</h2>
          <p>Tell me what you’re working on. I’ll reply with questions, a rough approach, or an honest “not a fit”.</p>
          <Link href="/contact" className="btn btn-primary btn-lg">Send a message</Link>
        </div>
      </section>
    </>
  );
}

function splitHeadline(h) {
  // Break a headline into balanced display lines: first clause, middle, and the last two words.
  const words = h.trim().split(/\s+/);
  if (words.length < 5) return [h];
  const comma = words.findIndex((w, i) => i < 4 && w.endsWith(','));
  const head = comma >= 0 ? words.slice(0, comma + 1) : [];
  const tail = words.slice(-2);
  const mid = words.slice(head.length, -2);
  return [head.join(' '), mid.join(' '), tail.join(' ')].filter(Boolean);
}
