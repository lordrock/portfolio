import Link from 'next/link';
import { apiGet, getSite, img } from '@/lib/api';
import Markdown from '@/components/Markdown';
import Availability from '@/components/Availability';

export const revalidate = 60;
export const metadata = { title: 'About', description: 'Biography, skills, experience and how I work.', alternates: { canonical: '/about' } };

const STATE = { active: 'Active use', learning: 'Learning', exploring: 'Exploring' };

export default async function About() {
  const [site, exp, skills] = await Promise.all([getSite(), apiGet('/experience'), apiGet('/skills')]);
  const p = site.profile;
  const groups = {};
  (skills?.items || []).forEach((s) => ((groups[s.group] ||= []).push(s)));
  const experience = exp?.items || [];

  return (
    <div className="container page">
      <header className="page-head">
        <h1>About</h1>
        {p?.role ? <p className="page-lede">{p.role}</p> : null}
      </header>

      <section className="about-grid">
        <div>
          <Markdown className="prose-lg">{p?.bio || p?.shortBio}</Markdown>
          <div className="about-actions">
            <Link href="/resume" className="btn btn-primary">View resume</Link>
            <a href="/resume/download" className="btn btn-quiet">Download PDF</a>
          </div>
        </div>
        <aside className="about-aside">
          {p?.photo?.url ? <img className="portrait" src={img(p.photo.url, 600)} alt={p.photo.alt || `Portrait of ${p.name}`} width="600" height="750" /> : null}
          <dl className="facts">
            {p?.location ? (<><dt>Based in</dt><dd>{p.location}</dd></>) : null}
            {p?.email ? (<><dt>Email</dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd></>) : null}
          </dl>
          <Availability availability={p?.availability} />
        </aside>
      </section>

      {Object.keys(groups).length ? (
        <section className="section" aria-labelledby="skills-title">
          <div className="section-head">
            <h2 id="skills-title">Skills</h2>
            <ul className="legend" aria-label="Skill status legend">
              {Object.entries(STATE).map(([k, v]) => (<li key={k}><span className="skill-mark" data-state={k} aria-hidden="true" />{v}</li>))}
            </ul>
          </div>
          <div className="skill-groups">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="skill-group">
                <h3>{group}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s._id}>
                      <span className="skill-mark" data-state={s.state} aria-hidden="true" />
                      {s.name}
                      <span className="sr-only"> ({STATE[s.state]})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {experience.length ? (
        <section className="section" aria-labelledby="exp-title">
          <h2 id="exp-title" className="section-title">Experience</h2>
          <ol className="timeline">
            {experience.map((e) => (
              <li key={e._id}>
                <p className="timeline-when">{[e.startLabel, e.current ? 'Present' : e.endLabel].filter(Boolean).join(' to ')}</p>
                <div>
                  <h3>{e.role}, {e.organization}</h3>
                  {e.location ? <p className="muted">{e.location}</p> : null}
                  {e.summary ? <p>{e.summary}</p> : null}
                  {e.highlights?.length ? <ul className="bullets">{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {p?.approach?.length ? (
        <section className="section" aria-labelledby="approach-title">
          <h2 id="approach-title" className="section-title">Approach</h2>
          <ul className="approach approach-wide">
            {p.approach.map((a) => (<li key={a.title}><h3>{a.title}</h3><p>{a.text}</p></li>))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
