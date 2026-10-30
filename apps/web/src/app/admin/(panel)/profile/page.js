'use client';
import { useEffect, useState } from 'react';
import { api, fmtDate, setIn } from '@/lib/adminApi';
import { Check, ImageField, MediaPicker, PageHeader, RowList, SelectField, TextArea, TextField, useToast } from '@/components/admin/ui';

export default function Page() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pick, setPick] = useState(false);
  const set = (p, v) => setForm((f) => setIn(f, p, v));

  useEffect(() => { api('/profile').then((p) => setForm({ ...p, availability: { status: 'available', text: '', note: '', ...(p.availability || {}) }, approach: p.approach || [], photo: p.photo || null, seo: p.seo || {} })).catch((e) => setError(e.message)); }, []);

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { resume, _id, key, createdAt, updatedAt, __v, ...body } = form;
      if (!body.photo?.url) body.photo = null;
      await api('/profile', { method: 'PUT', body });
      toast.push('Profile saved');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function setResume(m) {
    try { const r = await api('/profile/resume', { method: 'PUT', body: { url: m.url, publicId: m.publicId, filename: m.filename } }); set('resume', { ...form.resume, ...r }); toast.push('Resume updated'); } catch (e) { toast.push(e.message, 'error'); }
  }
  async function clearResume() {
    try { await api('/profile/resume', { method: 'DELETE' }); set('resume', {}); toast.push('Resume removed'); } catch (e) { toast.push(e.message, 'error'); }
  }

  if (!form) return error ? <p className="a-error" role="alert">{error}</p> : <p role="status">Loading…</p>;
  return (
    <form onSubmit={save}>
      <PageHeader title="Profile and settings" sub="Everything on Home, About, Contact and the footer comes from here."><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></PageHeader>
      {error ? <p className="a-error" role="alert">{error}</p> : null}

      <section className="a-card"><h2>Identity</h2>
        <div className="a-grid">
          <TextField label="Name" value={form.name} onChange={(v) => set('name', v)} required />
          <TextField label="Positioning headline" value={form.headline} onChange={(v) => set('headline', v)} hint="The big line on the home page." />
          <TextField label="Role line" value={form.role} onChange={(v) => set('role', v)} />
          <TextField label="Location" value={form.location} onChange={(v) => set('location', v)} />
          <TextField label="Public contact email" type="email" value={form.email} onChange={(v) => set('email', v)} />
          <TextArea label="Short bio (home page and search results)" value={form.shortBio} onChange={(v) => set('shortBio', v)} rows={3} maxLength={600} />
          <TextArea label="Full biography (Markdown)" value={form.bio} onChange={(v) => set('bio', v)} rows={10} />
        </div>
        <ImageField label="Portrait" value={form.photo} onChange={(v) => set('photo', v)} hint="Portrait orientation works best." />
      </section>

      <section className="a-card"><h2>Availability</h2>
        <div className="a-grid">
          <SelectField label="Status" value={form.availability.status} onChange={(v) => set('availability.status', v)} options={[{ value: 'available', label: 'Available for new work' }, { value: 'limited', label: 'Limited availability' }, { value: 'unavailable', label: 'Not taking new work' }]} />
          <TextField label="Text shown on the site" value={form.availability.text} onChange={(v) => set('availability.text', v)} placeholder="Open to new projects" />
          <TextArea label="Note on the contact page (optional)" value={form.availability.note} onChange={(v) => set('availability.note', v)} rows={2} />
        </div>
      </section>

      <section className="a-card"><h2>Resume</h2>
        {form.resume?.url ? (
          <p>Current file: <a href={form.resume.url} target="_blank" rel="noopener noreferrer">{form.resume.filename || 'resume.pdf'}</a> <span className="a-hint">updated {fmtDate(form.resume.updatedAt)}, downloaded {form.resume.downloads || 0} times</span></p>
        ) : <p className="a-hint">No PDF yet. The online resume page is still built from your Experience and Skills.</p>}
        <div className="a-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPick(true)}>{form.resume?.url ? 'Replace PDF' : 'Upload or choose PDF'}</button>
          {form.resume?.url ? <button type="button" className="btn btn-quiet btn-sm" onClick={clearResume}>Remove PDF</button> : null}
        </div>
        <MediaPicker open={pick} onOpenChange={setPick} kind="document" onPick={setResume} onUpload={(items) => { setResume(items[0]); setPick(false); }} />
      </section>

      <section className="a-card"><h2>How I work</h2>
        <RowList label="Principles (shown on Home and About)" value={form.approach} onChange={(v) => set('approach', v)} addLabel="Add principle" empty={{ title: '', text: '' }} fields={[{ name: 'title', label: 'Title' }, { name: 'text', label: 'Text', type: 'textarea' }]} />
      </section>

      <section className="a-card"><h2>Default search and sharing</h2>
        <div className="a-grid">
          <TextField label="SEO title" value={form.seo?.title} onChange={(v) => set('seo.title', v)} />
          <TextArea label="SEO description" value={form.seo?.description} onChange={(v) => set('seo.description', v)} rows={2} />
        </div>
      </section>
      <div className="a-savebar"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  );
}
