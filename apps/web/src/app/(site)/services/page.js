import Link from 'next/link';
import { apiGet, pillarKey } from '@/lib/api';
import Availability from '@/components/Availability';

export const revalidate = 60;
export const metadata = { title: 'Services', description: 'Design, full-stack web and mobile development, marketing and Web3 community services.', alternates: { canonical: '/services' } };

export default async function Services() {
  const [res, site] = await Promise.all([apiGet('/services'), apiGet('/site')]);
  const items = res?.items || [];
  const avail = site?.profile?.availability;
  return (
    <div className="container page">
      <header className="page-head">
        <h1>Services</h1>
        <p className="page-lede">Four areas, one point of contact. Pick the one closest to what you need, or describe it and I’ll point you in the right direction.</p>
        <Availability availability={avail} />
      </header>

      {items.length ? (
        <ul className="service-list">
          {items.map((s) => (
            <li key={s._id} className="service" data-pillar={pillarKey(s.pillar?.slug)} id={s.slug}>
              <div className="service-main">
                <h2>{s.title}</h2>
                <p className="service-summary">{s.description || s.summary}</p>
                <div className="service-actions">
                  <Link href={`/contact?service=${s.slug}`} className="btn btn-primary">Enquire about this</Link>
                  {s.pillar ? <Link href={`/work?pillar=${s.pillar.slug}`} className="text-link">See related work</Link> : null}
                </div>
              </div>
              {s.deliverables?.length ? (
                <div className="service-deliver">
                  <h3>What you get</h3>
                  <ul className="bullets">{s.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty"><h2>Services are being updated</h2><p>In the meantime, tell me what you need.</p><Link href="/contact" className="btn btn-primary">Get in touch</Link></div>
      )}
    </div>
  );
}
