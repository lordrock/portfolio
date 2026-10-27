'use client';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { api, getIn } from '@/lib/adminApi';
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, fileBadge } from '@/lib/media';

/* ------------------------------------------------------------------ Toasts */
const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (<p key={t.id} className="toast" data-kind={t.kind}>{t.message}</p>))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------ Form fields */
export function Field({ label, hint, children, wide }) {
  const id = useId();
  return (
    <div className={`a-field${wide ? ' a-field-wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(id) : children}
      {hint ? <p className="a-hint">{hint}</p> : null}
    </div>
  );
}

export const TextField = ({ label, value, onChange, hint, type = 'text', wide, ...rest }) => (
  <Field label={label} hint={hint} wide={wide}>
    {(id) => <input id={id} type={type} value={value ?? ''} onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} {...rest} />}
  </Field>
);
export const TextArea = ({ label, value, onChange, hint, rows = 4, wide = true, ...rest }) => (
  <Field label={label} hint={hint} wide={wide}>
    {(id) => <textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />}
  </Field>
);
export const SelectField = ({ label, value, onChange, options, hint, placeholder, wide }) => (
  <Field label={label} hint={hint} wide={wide}>
    {(id) => (
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )}
  </Field>
);
export function Check({ label, checked, onChange, hint }) {
  const id = useId();
  return (
    <div className="a-check">
      <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}{hint ? <span className="a-hint">{hint}</span> : null}</label>
    </div>
  );
}

/** Comma/enter separated list of short strings. */
export function TagInput({ label, value = [], onChange, hint, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <Field label={label} hint={hint} wide>
      {(id) => (
        <div className="a-tags">
          <ul>
            {value.map((t) => (
              <li key={t}>{t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button></li>
            ))}
          </ul>
          <input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={add}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }} />
        </div>
      )}
    </Field>
  );
}

/** Repeatable group of rows. `fields`: [{name,label,type?,options?,wide?}] */
export function RowList({ label, value = [], onChange, fields, addLabel = 'Add row', empty = {}, hint }) {
  const update = (i, name, v) => onChange(value.map((r, idx) => (idx === i ? { ...r, [name]: v } : r)));
  const move = (i, d) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <fieldset className="a-rows">
      <legend>{label}</legend>
      {hint ? <p className="a-hint">{hint}</p> : null}
      {value.map((row, i) => (
        <div className="a-row" key={i}>
          <div className="a-row-fields">
            {fields.map((f) =>
              f.type === 'select' ? (
                <SelectField key={f.name} label={f.label} value={row[f.name]} onChange={(v) => update(i, f.name, v)} options={f.options} />
              ) : f.type === 'textarea' ? (
                <TextArea key={f.name} label={f.label} rows={2} value={row[f.name]} onChange={(v) => update(i, f.name, v)} />
              ) : (
                <TextField key={f.name} label={f.label} value={row[f.name]} onChange={(v) => update(i, f.name, v)} placeholder={f.placeholder} />
              )
            )}
          </div>
          <div className="a-row-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down">↓</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange([...value, { ...empty }])}>{addLabel}</button>
    </fieldset>
  );
}

/** Simple string list (one input per line). */
export function LineList({ label, value = [], onChange, hint, placeholder }) {
  return (
    <TextArea label={label} hint={hint ?? 'One per line'} rows={Math.max(3, value.length + 1)} value={value.join('\n')} placeholder={placeholder}
      onChange={(v) => onChange(v.split('\n').map((s) => s.trimStart()).filter((s, i, a) => s !== '' || i < a.length - 1))} />
  );
}

/* ------------------------------------------------------------ Status bits */
export const StatusBadge = ({ status }) => <span className="a-badge" data-status={status}>{status}</span>;

export function AdminActionIcon({ name }) {
  const paths = {
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    copy: <><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    restore: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Confirm({ children, message, onConfirm, className = 'btn btn-quiet btn-sm', disabled, ariaLabel, title }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={className} disabled={disabled} aria-label={ariaLabel} title={title}>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="a-overlay" />
        <Dialog.Content className="a-dialog a-dialog-sm">
          <div className="a-dialog-head">
            <div className="a-dialog-icon a-dialog-icon-danger" aria-hidden="true">!</div>
            <div>
              <Dialog.Title>Are you sure?</Dialog.Title>
              <Dialog.Description>{message}</Dialog.Description>
            </div>
          </div>
          <div className="a-dialog-actions a-dialog-foot">
            <Dialog.Close className="btn btn-quiet">Cancel</Dialog.Close>
            <button type="button" className="btn btn-danger" onClick={() => { setOpen(false); onConfirm(); }}>Yes, continue</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ----------------------------------------------------------- Media picking */
export function MediaPicker({ open, onOpenChange, onPick, kind = 'image' }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setItems((await api(`/media?type=${kind}&limit=60`)).items); } catch (e) { setError(e.message); }
  }, [kind]);
  useEffect(() => { if (open) load(); }, [open, load]);

  async function upload(file) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const m = await api(`/media?kind=${kind}`, { method: 'POST', form });
      setItems((l) => [m, ...l]);
    } catch (e) { setError(e.message); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="a-overlay" />
        <Dialog.Content className="a-dialog">
          <div className="a-dialog-head">
            <div>
              <Dialog.Title>{kind === 'document' ? 'Choose or upload a document' : 'Choose or upload an image'}</Dialog.Title>
              <Dialog.Description>{kind === 'document' ? 'PDF, Office, OpenDocument, TXT, Markdown or CSV, up to 10 MB.' : 'JPEG, PNG, WebP or GIF, up to 8 MB.'}</Dialog.Description>
            </div>
            <Dialog.Close className="a-dialog-close" aria-label="Close dialog">×</Dialog.Close>
          </div>
          <div className="a-dialog-body">
            <div
              className={`a-upload a-dropzone a-dropzone-compact${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) upload(e.dataTransfer.files?.[0]); }}
            >
              <input id={`picker-upload-${kind}`} ref={fileRef} className="sr-only" type="file" accept={kind === 'document' ? DOCUMENT_ACCEPT : IMAGE_ACCEPT} onChange={(e) => upload(e.target.files?.[0])} disabled={busy} aria-label="Upload a file" />
              <span>{busy ? 'Uploading…' : 'Drop a file here or'}</span>
              <label className="btn btn-quiet btn-sm" htmlFor={`picker-upload-${kind}`}>Choose file</label>
            </div>
            {error ? <p className="a-error" role="alert">{error}</p> : null}
            {items.length ? (
              <ul className="a-media-grid">
                {items.map((m) => (
                  <li key={m._id}>
                    <button type="button" onClick={() => { onPick(m); onOpenChange(false); }}>
                      {m.resourceType === 'raw' ? <span className="a-doc">{fileBadge(m)}</span> : <img src={m.url} alt="" loading="lazy" />}
                      <span>{m.filename}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="a-empty">No files yet. Upload one above.</p>}
          </div>
          <div className="a-dialog-actions a-dialog-foot"><Dialog.Close className="btn btn-quiet">Close</Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const toImage = (m) => ({ url: m.url, publicId: m.publicId, alt: m.alt || '', width: m.width, height: m.height });

export function ImageField({ label, value, onChange, hint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-field a-field-wide">
      <span className="a-label">{label}</span>
      <div className="a-image-field">
        {value?.url ? <img src={value.url} alt="" /> : <div className="a-image-empty">No image</div>}
        <div className="a-image-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>{value?.url ? 'Replace image' : 'Choose image'}</button>
          {value?.url ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange(null)}>Remove</button> : null}
          {value?.url ? <TextField label="Alt text (describe the image)" value={value.alt} onChange={(v) => onChange({ ...value, alt: v })} /> : null}
        </div>
      </div>
      {hint ? <p className="a-hint">{hint}</p> : null}
      <MediaPicker open={open} onOpenChange={setOpen} onPick={(m) => onChange(toImage(m))} />
    </div>
  );
}

export function GalleryField({ label, value = [], onChange, hint }) {
  const [open, setOpen] = useState(false);
  const move = (i, d) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <fieldset className="a-rows">
      <legend>{label}</legend>
      {hint ? <p className="a-hint">{hint}</p> : null}
      <ul className="a-gallery">
        {value.map((im, i) => (
          <li key={`${im.url}-${i}`}>
            <img src={im.url} alt="" />
            <div>
              <TextField label="Alt text" value={im.alt} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, alt: v } : x)))} />
              <TextField label="Caption (optional)" value={im.caption} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, caption: v } : x)))} />
              <div className="a-row-actions">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move later">↓</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>Add image</button>
      <MediaPicker open={open} onOpenChange={setOpen} onPick={(m) => onChange([...value, { ...toImage(m), caption: '' }])} />
    </fieldset>
  );
}

/* -------------------------------------------------------------- Misc hooks */
export function useLoad(path, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await api(path), error: '', loading: false }); } catch (e) { setState({ data: null, error: e.message, loading: false }); }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload };
}

export const PageHeader = ({ title, children, sub }) => (
  <div className="a-page-head">
    <div><h1>{title}</h1>{sub ? <p className="a-hint">{sub}</p> : null}</div>
    <div className="a-page-actions">{children}</div>
  </div>
);
export { getIn };
