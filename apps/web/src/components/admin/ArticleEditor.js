'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, fmtDate, setIn } from '@/lib/adminApi';
import { Confirm, ImageField, PageHeader, StatusBadge, TagInput, TextArea, TextField, useToast } from './ui';

const blank = () => ({ title: '', slug: '', excerpt: '', body: '', cover: null, tags: [], seo: { title: '', description: '', ogImage: '' } });

export default function ArticleEditor({ id }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !id;
  const [form, setForm] = useState(blank());
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const set = (p, v) => setForm((f) => setIn(f, p, v));

  useEffect(() => {
    if (isNew) return;
    api(`/articles/${id}`).then((a) => { setForm({ ...blank(), ...a, seo: { ...blank().seo, ...(a.seo || {}) }, cover: a.cover || null }); setMeta(a); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id, isNew]);

  async function save() {
    const body = { ...form, cover: form.cover?.url ? form.cover : null };
    const doc = isNew ? await api('/articles', { method: 'POST', body }) : await api(`/articles/${id}`, { method: 'PUT', body });
    setMeta(doc); setForm((f) => ({ ...f, slug: doc.slug }));
    return doc;
  }
  const run = (name, fn) => async () => { setBusy(name); setError(''); try { await fn(); } catch (e) { setError(e.message); toast.push(e.message, 'error'); } finally { setBusy(''); } };
  const onSave = run('save', async () => { const d = await save(); toast.push('Saved'); if (isNew) router.replace(`/admin/articles/${d._id}`); });
  const act = (action, label) => run(action, async () => { const d = await save(); const r = await api(`/articles/${d._id}/${action}`, { method: 'POST' }); setMeta(r); toast.push(label); if (isNew) router.replace(`/admin/articles/${d._id}`); });
  const onDelete = run('delete', async () => { await api(`/articles/${id}`, { method: 'DELETE' }); toast.push('Draft deleted'); router.push('/admin/articles'); });

  if (loading) return <p role="status">Loading…</p>;
  const status = meta?.status || 'draft';
  return (
    <>
      <PageHeader title={isNew ? 'New article' : form.title || 'Edit article'} sub={meta ? `Last saved ${fmtDate(meta.updatedAt)}` : 'Not saved yet'}><Link href="/admin/articles" className="btn btn-quiet">Back to Insights</Link></PageHeader>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      <div className="a-editor">
        <div className="a-editor-main">
          <section className="a-card">
            <h2>Article</h2>
            <div className="a-grid">
              <TextField label="Title" value={form.title} onChange={(v) => set('title', v)} wide required />
              <TextField label="URL slug" value={form.slug} onChange={(v) => set('slug', v)} placeholder="auto-generated" />
              <TextArea label="Excerpt" value={form.excerpt} onChange={(v) => set('excerpt', v)} rows={2} maxLength={400} hint="Required to publish." />
              <TextArea label="Body (Markdown)" value={form.body} onChange={(v) => set('body', v)} rows={18} hint="Headings, lists, links, quotes and code blocks are supported." />
            </div>
            <ImageField label="Cover image" value={form.cover} onChange={(v) => set('cover', v)} />
            <TagInput label="Tags" value={form.tags} onChange={(v) => set('tags', v)} />
          </section>
          <section className="a-card">
            <h2>Search and sharing</h2>
            <div className="a-grid">
              <TextField label="SEO title (optional)" value={form.seo.title} onChange={(v) => set('seo.title', v)} />
              <TextArea label="SEO description (optional)" value={form.seo.description} onChange={(v) => set('seo.description', v)} rows={2} />
            </div>
          </section>
        </div>
        <aside className="a-editor-side">
          <section className="a-card a-sticky">
            <h2>Publishing</h2>
            <p>Status: <StatusBadge status={status} /></p>
            <p className="a-hint">Insights appears in the site navigation as soon as one article is published.</p>
            <div className="a-stack">
              <button type="button" className="btn btn-primary" onClick={onSave} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
              {status === 'draft' ? <button type="button" className="btn btn-quiet" onClick={act('publish', 'Published')} disabled={Boolean(busy)}>Publish</button> : null}
              {status === 'published' ? <button type="button" className="btn btn-quiet" onClick={act('unpublish', 'Moved back to draft')} disabled={Boolean(busy)}>Unpublish</button> : null}
              {status !== 'archived' && !isNew ? <button type="button" className="btn btn-quiet" onClick={act('archive', 'Archived')} disabled={Boolean(busy)}>Archive</button> : null}
              {status === 'archived' ? <button type="button" className="btn btn-quiet" onClick={act('restore', 'Restored as a draft')} disabled={Boolean(busy)}>Restore as draft</button> : null}
              {status === 'draft' && !isNew ? <Confirm className="btn btn-quiet a-danger" message="This permanently deletes the draft." onConfirm={onDelete}>Delete draft</Confirm> : null}
            </div>
            {status === 'published' ? <p className="a-hint"><Link href={`/insights/${form.slug}`} target="_blank">View live article</Link></p> : null}
          </section>
        </aside>
      </div>
    </>
  );
}
