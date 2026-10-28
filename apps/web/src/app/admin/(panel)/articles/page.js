'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, fmtDate } from '@/lib/adminApi';
import { AdminActionIcon, Confirm, PageHeader, StatusBadge, useLoad, useToast } from '@/components/admin/ui';

export default function Page() {
  const { data, error, loading, reload } = useLoad('/articles');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const toast = useToast();

  async function act(article, action) {
    setBusy(`${action}:${article._id}`); setActionError('');
    try {
      if (action === 'duplicate') {
        await api(`/articles/${article._id}/duplicate`, { method: 'POST' });
        toast.push(`Duplicated “${article.title}” as a draft`);
      } else if (action === 'delete') {
        await api(`/articles/${article._id}`, { method: 'DELETE' });
        toast.push(`Deleted draft “${article.title}”`);
      } else {
        await api(`/articles/${article._id}/${action}`, { method: 'POST' });
        toast.push(action === 'archive' ? `Archived “${article.title}”` : `Restored “${article.title}” as a draft`);
      }
      await reload();
    } catch (e) {
      setActionError(e.message);
      toast.push(e.message, 'error');
    } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader title="Articles" sub="Writing, practical guides, and learning notes. The Articles page stays hidden until one is published."><Link href="/admin/articles/new" className="btn btn-primary">New article</Link></PageHeader>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {actionError ? <p className="a-error" role="alert">{actionError}</p> : null}
      {loading ? <p role="status">Loading…</p> : data?.items?.length ? (
        <div className="a-table-wrap a-responsive-table-wrap"><table className="a-table a-responsive-table"><thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col" className="a-actions-head">Actions</th></tr></thead>
          <tbody>{data.items.map((a) => (
            <tr key={a._id}>
              <td data-label="Title"><strong>{a.title}</strong></td><td data-label="Status"><StatusBadge status={a.status} /></td><td data-label="Updated">{fmtDate(a.updatedAt)}</td>
              <td className="a-actions" data-label="Actions">
                <Link href={`/admin/articles/${a._id}`} className="a-icon-btn" aria-label={`Edit ${a.title}`} title="Edit"><AdminActionIcon name="edit" /></Link>
                <button type="button" className="a-icon-btn" aria-label={`Duplicate ${a.title}`} title="Duplicate" onClick={() => act(a, 'duplicate')} disabled={Boolean(busy)}><AdminActionIcon name="copy" /></button>
                {a.status === 'archived' ? (
                  <button type="button" className="a-icon-btn" aria-label={`Restore ${a.title}`} title="Restore as draft" onClick={() => act(a, 'restore')} disabled={Boolean(busy)}><AdminActionIcon name="restore" /></button>
                ) : (
                  <Confirm className="a-icon-btn a-icon-danger" ariaLabel={`${a.status === 'draft' ? 'Delete draft' : 'Archive'} ${a.title}`} title={a.status === 'draft' ? 'Delete draft' : 'Archive'}
                    message={a.status === 'draft' ? `This permanently deletes “${a.title}”.` : `“${a.title}” will be removed from Articles and kept safely in the archive.`}
                    onConfirm={() => act(a, a.status === 'draft' ? 'delete' : 'archive')} disabled={Boolean(busy)}><AdminActionIcon name="trash" /></Confirm>
                )}
              </td>
            </tr>
          ))}</tbody></table></div>
      ) : <p className="a-empty">No articles yet.</p>}
    </>
  );
}
