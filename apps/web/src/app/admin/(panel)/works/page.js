'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/adminApi';
import { AdminActionIcon, Confirm, PageHeader, StatusBadge, useLoad, useToast } from '@/components/admin/ui';

const TYPE = { design: 'Design', development: 'Web & Mobile', marketing: 'Marketing', web3: 'Web3' };

function WorkList() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get('status') || '';
  const type = sp.get('type') || '';
  const [q, setQ] = useState(sp.get('q') || '');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const toast = useToast();
  const [debounced, setDebounced] = useState(q);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  const qs = new URLSearchParams({ ...(status && { status }), ...(type && { type }), ...(debounced && { q: debounced }) }).toString();
  const { data, error, loading, reload } = useLoad(`/works${qs ? `?${qs}` : ''}`);
  const setParam = (k, v) => { const n = new URLSearchParams(sp.toString()); v ? n.set(k, v) : n.delete(k); router.replace(`/admin/works${n.toString() ? `?${n}` : ''}`); };

  async function act(w, action) {
    const key = `${action}:${w._id}`;
    setBusy(key); setActionError('');
    try {
      if (action === 'duplicate') {
        await api(`/works/${w._id}/duplicate`, { method: 'POST' });
        toast.push(`Duplicated “${w.title}” as a draft`);
      } else if (action === 'delete') {
        await api(`/works/${w._id}`, { method: 'DELETE' });
        toast.push(`Deleted draft “${w.title}”`);
      } else if (action === 'archive') {
        await api(`/works/${w._id}/archive`, { method: 'POST' });
        toast.push(`Archived “${w.title}”`);
      } else if (action === 'restore') {
        await api(`/works/${w._id}/restore`, { method: 'POST' });
        toast.push(`Restored “${w.title}” as a draft`);
      }
      await reload();
    } catch (e) {
      setActionError(e.message);
      toast.push(e.message, 'error');
    } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader title="Work" sub="Every project: drafts, published and archived."><Link href="/admin/works/new" className="btn btn-primary">New work</Link></PageHeader>
      <div className="a-filters">
        <div className="a-tabs" role="group" aria-label="Status">
          {['', 'draft', 'published', 'archived'].map((s) => (<button key={s || 'all'} type="button" aria-pressed={status === s} onClick={() => setParam('status', s)}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>))}
        </div>
        <label className="sr-only" htmlFor="wtype">Type</label>
        <select id="wtype" value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="sr-only" htmlFor="wq">Search</label>
        <input id="wq" type="search" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {actionError ? <p className="a-error" role="alert">{actionError}</p> : null}
      {loading ? <p role="status">Loading…</p> : data?.items?.length ? (
        <div className="a-table-wrap a-responsive-table-wrap">
          <table className="a-table a-responsive-table">
            <thead><tr><th scope="col">Work</th><th scope="col">Type</th><th scope="col">Area</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col" className="a-actions-head">Actions</th></tr></thead>
            <tbody>
              {data.items.map((w) => (
                <tr key={w._id}>
                  <td data-label="Work"><div className="a-titlecell">{w.cover?.url ? <img src={w.cover.url} alt="" /> : <span className="a-thumb-empty" />}<span><strong>{w.title}</strong>{w.featured ? <span className="a-hint"> Featured</span> : null}{w.isSample ? <span className="a-hint"> Sample</span> : null}</span></div></td>
                  <td data-label="Type">{TYPE[w.type]}</td><td data-label="Area">{w.primaryCategory?.name}</td><td data-label="Status"><StatusBadge status={w.status} /></td><td data-label="Updated">{fmtDate(w.updatedAt)}</td>
                  <td className="a-actions" data-label="Actions">
                    <Link href={`/admin/works/${w._id}`} className="a-icon-btn" aria-label={`Edit ${w.title}`} title="Edit"><AdminActionIcon name="edit" /></Link>
                    <button type="button" className="a-icon-btn" aria-label={`Duplicate ${w.title}`} title="Duplicate" onClick={() => act(w, 'duplicate')} disabled={Boolean(busy)}><AdminActionIcon name="copy" /></button>
                    {w.status === 'archived' ? (
                      <button type="button" className="a-icon-btn" aria-label={`Restore ${w.title}`} title="Restore as draft" onClick={() => act(w, 'restore')} disabled={Boolean(busy)}><AdminActionIcon name="restore" /></button>
                    ) : (
                      <Confirm
                        className="a-icon-btn a-icon-danger"
                        ariaLabel={`${w.status === 'draft' ? 'Delete draft' : 'Archive'} ${w.title}`}
                        title={w.status === 'draft' ? 'Delete draft' : 'Archive'}
                        message={w.status === 'draft' ? `This permanently deletes “${w.title}”.` : `“${w.title}” will be removed from the public site and kept safely in the archive.`}
                        onConfirm={() => act(w, w.status === 'draft' ? 'delete' : 'archive')}
                        disabled={Boolean(busy)}
                      ><AdminActionIcon name="trash" /></Confirm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="a-empty">Nothing matches. <Link href="/admin/works/new">Create a work item</Link>.</p>}
    </>
  );
}
export default function Page() { return <Suspense fallback={<p role="status">Loading…</p>}><WorkList /></Suspense>; }
