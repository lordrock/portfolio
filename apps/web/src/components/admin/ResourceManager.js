'use client';
import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { api, setIn } from '@/lib/adminApi';
import { Check, Confirm, ImageField, LineList, PageHeader, SelectField, TagInput, TextArea, TextField, useToast } from './ui';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/**
 * Config-driven list + editor for simple resources.
 * fields: [{ name, label, type: text|textarea|number|checkbox|select|tags|lines|image|relation, options?, optionsFrom?:{path,label,value?}, showIf?(form), hint?, required? }]
 * columns: [{ label, render(item) }]
 */
export default function ResourceManager({ title, sub, endpoint, singular, fields, columns, blank, reorderable = false, canDelete = () => true, listQuery = '', deleteHint, afterLoad }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [relations, setRelations] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`${endpoint}${listQuery}`);
      setItems(res.items);
      afterLoad?.(res.items);
      setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [endpoint, listQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fields.filter((f) => f.optionsFrom).forEach(async (f) => {
      try {
        const res = await api(f.optionsFrom.path);
        setRelations((r) => ({ ...r, [f.name]: res.items.filter((i) => (f.optionsFrom.filter ? f.optionsFrom.filter(i) : true)).map((i) => ({ value: i._id, label: i[f.optionsFrom.label || 'name'] || i.title })) }));
      } catch {}
    });
  }, [fields]);

  const openNew = () => { setFormError(''); setForm({ ...blank, order: items.length * 10 }); };
  const openEdit = (item) => {
    setFormError('');
    const f = { ...item };
    fields.filter((x) => x.type === 'relation').forEach((x) => { f[x.name] = idOf(f[x.name]) || ''; });
    setForm(f);
  };
  const set = (name, v) => setForm((f) => setIn(f, name, v));

  async function save(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    const body = { ...form };
    fields.filter((x) => x.type === 'relation').forEach((x) => { if (!body[x.name]) body[x.name] = x.nullable ? null : body[x.name]; });
    try {
      if (form._id) await api(`${endpoint}/${form._id}`, { method: 'PUT', body });
      else await api(endpoint, { method: 'POST', body });
      toast.push(`${singular} saved`);
      setForm(null);
      load();
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }

  async function remove(item) {
    try { await api(`${endpoint}/${item._id}`, { method: 'DELETE' }); toast.push(`${singular} deleted`); load(); }
    catch (err) { toast.push(err.message, 'error'); }
  }

  async function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    try { await api(`${endpoint}/reorder/batch`, { method: 'PATCH', body: { items: next.map((x, idx) => ({ id: x._id, order: idx * 10 })) } }); load(); }
    catch (err) { toast.push(err.message, 'error'); load(); }
  }

  const renderField = (f) => {
    if (f.showIf && !f.showIf(form)) return null;
    const v = form[f.name];
    const common = { key: f.name, label: f.label, hint: f.hint };
    switch (f.type) {
      case 'textarea': return <TextArea {...common} value={v} onChange={(x) => set(f.name, x)} rows={f.rows || 4} required={f.required} />;
      case 'number': return <TextField {...common} type="number" value={v} onChange={(x) => set(f.name, x)} />;
      case 'checkbox': return <Check key={f.name} label={f.label} hint={f.hint} checked={v} onChange={(x) => set(f.name, x)} />;
      case 'select': return <SelectField {...common} value={v} onChange={(x) => set(f.name, x)} options={f.options} />;
      case 'tags': return <TagInput {...common} value={v || []} onChange={(x) => set(f.name, x)} />;
      case 'lines': return <LineList {...common} value={v || []} onChange={(x) => set(f.name, x)} />;
      case 'image': return <ImageField {...common} value={v} onChange={(x) => set(f.name, x)} />;
      case 'relation': return <SelectField {...common} value={v} onChange={(x) => set(f.name, x)} options={relations[f.name] || []} placeholder={f.placeholder || 'Choose…'} />;
      default: return <TextField {...common} value={v} onChange={(x) => set(f.name, x)} required={f.required} />;
    }
  };

  return (
    <>
      <PageHeader title={title} sub={sub}><button type="button" className="btn btn-primary" onClick={openNew}>Add {singular.toLowerCase()}</button></PageHeader>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {loading ? <p role="status">Loading…</p> : items.length ? (
        <div className="a-table-wrap a-responsive-table-wrap">
          <table className="a-table a-responsive-table">
            <thead><tr>{columns.map((c) => <th key={c.label} scope="col">{c.label}</th>)}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item._id}>
                  {columns.map((c) => <td key={c.label} data-label={c.label}>{c.render(item)}</td>)}
                  <td className="a-actions" data-label="Actions">
                    {reorderable ? (<>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${i + 1} up`}>↑</button>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${i + 1} down`}>↓</button>
                    </>) : null}
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    {canDelete(item) ? <Confirm message={deleteHint || `This permanently deletes the ${singular.toLowerCase()}.`} onConfirm={() => remove(item)}>Delete</Confirm> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="a-empty">No {title.toLowerCase()} yet. Add the first one.</p>}

      <Dialog.Root open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="a-overlay" />
          <Dialog.Content className="a-dialog" aria-describedby={undefined}>
            <div className="a-dialog-head">
              <div>
                <Dialog.Title>{form?._id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}</Dialog.Title>
                <p>Complete the details below, then save your changes.</p>
              </div>
              <Dialog.Close className="a-dialog-close" aria-label="Close dialog">×</Dialog.Close>
            </div>
            {form ? (
              <form onSubmit={save} className="a-form a-dialog-form">
                <div className="a-dialog-body">
                  {formError ? <p className="a-error" role="alert">{formError}</p> : null}
                  <div className="a-grid">{fields.map(renderField)}</div>
                </div>
                <div className="a-dialog-actions a-dialog-foot">
                  <Dialog.Close className="btn btn-quiet" type="button">Cancel</Dialog.Close>
                  <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
