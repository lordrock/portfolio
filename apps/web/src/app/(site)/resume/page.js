import { apiGet } from '@/lib/api';

export const revalidate = 60;
export const metadata = { title: 'Resume', description: 'Experience, skills and selected work.', alternates: { canonical: '/resume' } };
const STATE = { active: 'active use', learning: 'learning', exploring: 'exploring' };

export default async function Resume() {
  const [site, exp, skills] = await Promise.all([apiGet('/site'), apiGet('/experience'), apiGet('/skills')]);
  const p = site?.profile;
  const groups = {};
  (skills?.items || []).forEach((s) => ((groups[s.group] ||= []).push(s)));
  return (
    <div className="container page resume">
      <header className="page-head resume-head">
        <div>
          <h1>{p?.name || 'Resume'}</h1>
          {p?.role ? <p className="page-lede">{p.role}</p> : null}
        </div>
        <div className="resume-actions no-print">
          {p?.resume?.url ? <a className="btn btn-primary" href="/resume/download">Download PDF</a> : null}
          <button type="button" className="btn btn-quiet" id="print-btn" data-print>Print</button>
        </div>
      </header>
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('click',function(e){var b=e.target.closest('[data-print]');if(b)window.print()})" }} />
      <p className="resume-contact">
        {[p?.email, p?.location].filter(Boolean).join('   ')}
      </p>
      {p?.shortBio ? <section><h2>Profile</h2><p>{p.shortBio}</p></section> : null}
      {(exp?.items || []).length ? (
        <section>
          <h2>Experience</h2>
          <ol className="timeline">
            {exp.items.map((e) => (
              <li key={e._id}>
                <p className="timeline-when">{[e.startLabel, e.current ? 'Present' : e.endLabel].filter(Boolean).join(' to ')}</p>
                <div>
                  <h3>{e.role}, {e.organization}</h3>
                  {e.summary ? <p>{e.summary}</p> : null}
                  {e.highlights?.length ? <ul className="bullets">{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {Object.keys(groups).length ? (
        <section>
          <h2>Skills</h2>
          <dl className="resume-skills">
            {Object.entries(groups).map(([g, items]) => (
              <div key={g}><dt>{g}</dt><dd>{items.map((s) => (s.state === 'active' ? s.name : `${s.name} (${STATE[s.state]})`)).join(', ')}</dd></div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
