import { apiGet } from '@/lib/api';
import ContactForm from '@/components/ContactForm';
import Availability from '@/components/Availability';

export const metadata = { title: 'Contact', description: 'Send a project inquiry or get in touch.', alternates: { canonical: '/contact' } };

export default async function Contact({ searchParams }) {
  const query = await searchParams;
  const [site, res] = await Promise.all([apiGet('/site', { revalidate: 30 }), apiGet('/services')]);
  const services = res?.items || [];
  const wanted = typeof query?.service === 'string' ? query.service : '';
  const pillar = typeof query?.pillar === 'string' ? query.pillar : '';
  const defaultTopic = (services.find((s) => s.slug === wanted) || services.find((s) => pillar && s.pillar?.slug === pillar))?.title || '';
  const p = site?.profile;
  return (
    <div className="container page contact-page">
      <header className="page-head">
        <h1>Let’s talk</h1>
        <p className="page-lede">Tell me about the project. A few clear sentences are plenty.</p>
      </header>
      <div className="contact-grid">
        <ContactForm services={services} defaultTopic={defaultTopic} />
        <aside className="contact-aside">
          <Availability availability={p?.availability} />
          {p?.availability?.note ? <p className="muted">{p.availability.note}</p> : null}
          {p?.email ? (<><h2>Email</h2><p><a href={`mailto:${p.email}`}>{p.email}</a></p></>) : null}
          {p?.location ? (<><h2>Based in</h2><p>{p.location}</p></>) : null}
          {p?.socials?.length ? (
            <>
              <h2>Elsewhere</h2>
              <ul className="link-list">
                {p.socials.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
