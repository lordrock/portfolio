'use client';
import Link from 'next/link';
import { fmtDate } from '@/lib/adminApi';
import { PageHeader, StatusBadge, useLoad } from '@/components/admin/ui';

export default function Dashboard() {
  const { data, error, loading } = useLoad('/overview');
  if (loading) return <p role="status">Loading…</p>;
  if (error) return <p className="a-error" role="alert">{error}</p>;
  const d = data;
  return (
    <>
      <PageHeader title="Dashboard" sub="A factual snapshot. Nothing here is an engagement estimate.">
        <Link href="/admin/works/new" className="btn btn-primary">New work</Link>
      </PageHeader>

      {d.sampleWorks > 0 ? (
        <p className="a-notice" role="note"><strong>{d.sampleWorks} sample work {d.sampleWorks === 1 ? 'item is' : 'items are'} live.</strong> Replace them with your real projects before sharing the site. <Link href="/admin/works">Review work</Link></p>
      ) : null}
      {d.storage === 'local' ? <p className="a-notice" role="note">Images are stored on this server’s disk. Add Cloudinary credentials to the API environment before going live.</p> : null}
      {d.email === 'not-configured' ? <p className="a-notice" role="note">Email is not configured. Inquiries are saved here, but you won’t get notified by email until you add a Resend API key.</p> : null}

      <section className="a-stats" aria-label="Counts">
        <Stat label="Published work" value={d.works.published} href="/admin/works?status=published" />
        <Stat label="Drafts" value={d.works.draft} href="/admin/works?status=draft" />
        <Stat label="Archived" value={d.works.archived} href="/admin/works?status=archived" />
        <Stat label="New inquiries" value={d.inquiries.new} href="/admin/inquiries" />
        <Stat label="Testimonials awaiting approval" value={d.testimonialsPending} href="/admin/testimonials" />
        <Stat label="Media files" value={d.media} href="/admin/media" />
      </section>

      <div className="a-two">
        <section className="a-card">
          <h2>Published by area</h2>
          <ul className="a-plain">{d.pillars.map((p) => (<li key={p._id}><span>{p.name}</span><strong>{p.published}</strong></li>))}</ul>
        </section>
        <section className="a-card">
          <h2>Latest inquiries</h2>
          {d.recentInquiries.length ? (
            <ul className="a-plain">{d.recentInquiries.map((i) => (<li key={i._id}><span>{i.name}{i.topic ? ` (${i.topic})` : ''}</span><span className="a-hint">{fmtDate(i.createdAt)}</span></li>))}</ul>
          ) : <p className="a-empty">No inquiries yet.</p>}
        </section>
      </div>

      <section className="a-card">
        <h2>Recently edited work</h2>
        {d.recentWorks.length ? (
          <ul className="a-plain">{d.recentWorks.map((w) => (<li key={w._id}><Link href={`/admin/works/${w._id}`}>{w.title}</Link><span><StatusBadge status={w.status} /> <span className="a-hint">{fmtDate(w.updatedAt)}</span></span></li>))}</ul>
        ) : <p className="a-empty">Nothing yet. Create your first work item.</p>}
      </section>

      <section className="a-card">
        <h2>Recent admin activity</h2>
        <ul className="a-plain">{d.activity.map((a) => (<li key={a._id}><span>{a.action} {a.entity}{a.summary ? `: ${a.summary}` : ''}</span><span className="a-hint">{fmtDate(a.at)}</span></li>))}</ul>
      </section>
    </>
  );
}

const Stat = ({ label, value, href }) => (<Link href={href} className="a-stat"><strong>{value}</strong><span>{label}</span></Link>);
