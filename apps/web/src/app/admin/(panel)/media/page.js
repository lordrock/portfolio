'use client';
import { useDeferredValue, useRef, useState } from 'react';
import { api } from '@/lib/adminApi';
import { MEDIA_ACCEPT, fileBadge, isImageFile } from '@/lib/media';
import { Confirm, PageHeader, useLoad, useToast } from '@/components/admin/ui';

export default function Page() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const { data, error, loading, reload } = useLoad(`/media?limit=100${deferredSearch ? `&q=${encodeURIComponent(deferredSearch)}` : ''}`);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  async function upload(files) {
    setBusy(true);
    for (const file of files) {
      try {
        const form = new FormData(); form.append('file', file);
        await api(`/media?kind=${isImageFile(file) ? 'image' : 'document'}`, { method: 'POST', form });
      } catch (e) { toast.push(`${file.name}: ${e.message}`, 'error'); }
    }
    setBusy(false); if (ref.current) ref.current.value = ''; reload();
  }
  async function setAlt(m, alt) { try { await api(`/media/${m._id}`, { method: 'PATCH', body: { alt } }); toast.push('Alt text saved'); } catch (e) { toast.push(e.message, 'error'); } }
  async function remove(m) { try { await api(`/media/${m._id}`, { method: 'DELETE' }); toast.push('File deleted'); reload(); } catch (e) { toast.push(e.message, 'error'); } }

  return (
    <>
      <PageHeader title="Media library" sub="Images and documents. Pick them from any editor; only delete a file after confirming it is no longer in use." />
      <div
        className={`a-dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) upload([...e.dataTransfer.files]); }}
      >
        <input id="media-upload" ref={ref} className="sr-only" type="file" multiple accept={MEDIA_ACCEPT} onChange={(e) => upload([...e.target.files])} disabled={busy} />
        <div className="a-dropzone-icon" aria-hidden="true">↑</div>
        <div><strong>{busy ? 'Uploading files…' : 'Drop files here'}</strong><p>Images, PDF, Word, Excel, PowerPoint, OpenDocument, TXT, Markdown or CSV.</p></div>
        <label className="btn btn-primary" htmlFor="media-upload">Choose files</label>
      </div>
      <div className="a-media-search">
        <label htmlFor="media-search">Search media</label>
        <div className="a-search-input">
          <span aria-hidden="true">⌕</span>
          <input id="media-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Start typing a filename, alt text or file type…" autoComplete="off" />
          {search ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSearch('')} aria-label="Clear media search">Clear</button> : null}
        </div>
        <p className="a-hint" aria-live="polite">{deferredSearch ? `${data?.total ?? 0} file${data?.total === 1 ? '' : 's'} beginning with “${deferredSearch}”` : `${data?.total ?? 0} files in the library`}</p>
      </div>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {loading ? <p role="status">Loading…</p> : data?.items?.length ? (
        <ul className="a-media-lib">
          {data.items.map((m) => (
            <li key={m._id}>
              {m.resourceType === 'raw' ? <span className="a-doc">{fileBadge(m)}</span> : <img src={m.url} alt={m.alt || ''} loading="lazy" />}
              <p className="a-clip" title={m.filename}>{m.filename}</p>
              <p className="a-hint">{m.size ? `${(m.size / 1024).toFixed(0)} KB` : ''}{m.width ? `, ${m.width} × ${m.height}` : ''}</p>
              {m.resourceType !== 'raw' ? <div className="a-field"><label htmlFor={`alt-${m._id}`}>Alt text</label><input id={`alt-${m._id}`} defaultValue={m.alt} onBlur={(e) => e.target.value !== (m.alt || '') && setAlt(m, e.target.value)} /></div> : null}
              <div className="a-actions">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => { navigator.clipboard?.writeText(m.url.startsWith('/') ? `${location.origin}${m.url}` : m.url); toast.push('Link copied'); }}>Copy link</button>
                <Confirm message="This deletes the file from storage. Pages that use it will show a broken image." onConfirm={() => remove(m)}>Delete</Confirm>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="a-empty">{deferredSearch ? `No files begin with “${deferredSearch}”. Try another search.` : 'No files yet. Drop an image or document above.'}</p>}
    </>
  );
}
