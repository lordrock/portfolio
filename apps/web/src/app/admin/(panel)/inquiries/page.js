'use client';
import { useState } from 'react';
import { api, fmtDate } from '@/lib/adminApi';
import { Confirm, PageHeader, StatusBadge, useLoad, useToast } from '@/components/admin/ui';

export default function Page() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);
  const { data, error, loading, reload } = useLoad(`/inquiries${status ? `?status=${status}` : ''}`, [status]);

  async function setState(item, s) {
    try { await api(`/inquiries/${item._id}`, { method: 'PATCH', body: { status: s } }); reload(); } catch (e) { toast.push(e.message, 'error'); }
  }
  async function remove(item) {
    try { await api(`/inquiries/${item._id}`, { method: 'DELETE' }); toast.push('Inquiry deleted'); reload(); } catch (e) { toast.push(e.message, 'error'); }
  }
  async function toggle(item) {
    setOpenId(openId === item._id ? null : item._id);
    if (item.status === 'new') setState(item, 'read');
  }

  return (
    <>
      <PageHeader title="Inquiries" sub="Messages from the contact form. Delete them when your retention period ends (the privacy notice says 12 months)." />
      <div className="a-tabs" role="group" aria-label="Filter">
        {['', 'new', 'read', 'archived'].map((s) => (<button key={s || 'all'} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>))}
      </div>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {loading ? <p role="status">Loading…</p> : data?.items?.length ? (
        <ul className="a-inbox">
          {data.items.map((i) => (
            <li key={i._id} data-new={i.status === 'new'}>
              <button type="button" className="a-inbox-head" aria-expanded={openId === i._id} onClick={() => toggle(i)}>
                <strong>{i.name}</strong><span>{i.topic || 'No topic'}</span><span className="a-hint">{fmtDate(i.createdAt)}</span><StatusBadge status={i.status} />
              </button>
              {openId === i._id ? (
                <div className="a-inbox-body">
                  <p className="a-hint">From <a href={`mailto:${i.email}`}>{i.email}</a></p>
                  <p className="a-message">{i.message}</p>
                  <p className="a-hint">{i.notified ? 'Owner notified by email.' : 'No email notification was sent for this message.'}</p>
                  <div className="a-actions">
                    <a className="btn btn-primary btn-sm" href={`mailto:${i.email}?subject=${encodeURIComponent(`Re: ${i.topic || 'your message'}`)}`}>Reply by email</a>
                    {i.status !== 'archived' ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => setState(i, 'archived')}>Archive</button> : <button type="button" className="btn btn-quiet btn-sm" onClick={() => setState(i, 'read')}>Move to read</button>}
                    <Confirm message="This permanently deletes the message and the sender’s details." onConfirm={() => remove(i)}>Delete</Confirm>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="a-empty">No inquiries here.</p>}
    </>
  );
}
