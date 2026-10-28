'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fmtDate, setIn } from '@/lib/adminApi';
import { Check, Confirm, GalleryField, ImageField, LineList, PageHeader, RowList, SelectField, StatusBadge, TagInput, TextArea, TextField, useToast } from './ui';

const TYPES = [
  { value: 'design', label: 'Design (flyers, posters, logos, galleries)' },
  { value: 'development', label: 'Web & mobile development case study' },
  { value: 'marketing', label: 'Marketing or ambassador campaign' },
  { value: 'web3', label: 'Web3 and community' },
];
const PROJECT_STATUS = [
  { value: 'none', label: 'Not shown' }, { value: 'live', label: 'Live' }, { value: 'in-development', label: 'In development' },
  { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' },
];

const blank = () => ({
  type: 'development', title: '', slug: '', summary: '', body: '', cover: null, gallery: [],
  primaryCategory: '', categories: [], subcategories: [], tags: [], technologies: [],
  visibility: 'public', projectStatus: 'none', featured: false, featuredOrder: 0, order: 0, dateLabel: '',
  seo: { title: '', description: '', ogImage: '' },
  design: { assetType: '', client: '', brief: '', process: '' },
  development: { role: '', stack: [], features: [], challenge: '', solution: '', architecture: '', outcomes: '', repoUrl: '', liveUrl: '' },
  marketing: { brand: '', role: '', objective: '', platforms: [], duration: '', outcome: '', evidenceLinks: [], metrics: [], permissionConfirmed: false },
  web3: { kind: 'community', program: '', network: '', role: '', explorerUrl: '', repoUrl: '', contractAddress: '', contractVerified: false, disclaimer: '', evidenceLinks: [] },
});

const merge = (base, doc) => {
  const out = { ...base, ...doc };
  ['seo', 'design', 'development', 'marketing', 'web3'].forEach((k) => { out[k] = { ...base[k], ...(doc[k] || {}) }; });
  out.cover = doc.cover || null;
  return out;
};

export default function WorkEditor({ id }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !id;
  const [form, setForm] = useState(blank());
  const [meta, setMeta] = useState(null); // { _id, status, updatedAt, publishedAt, isSample }
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const set = (path, v) => { setForm((f) => setIn(f, path, v)); setDirty(true); };

  useEffect(() => { api('/categories?limit=200').then((r) => setCats(r.items)).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (isNew) return;
    api(`/works/${id}`).then((doc) => {
      setForm(merge(blank(), { ...doc, primaryCategory: String(doc.primaryCategory || '') }));
      setMeta({ _id: doc._id, status: doc.status, updatedAt: doc.updatedAt, publishedAt: doc.publishedAt, isSample: doc.isSample });
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const pillars = useMemo(() => cats.filter((c) => c.kind === 'pillar'), [cats]);
  const selectedPillarIds = useMemo(() => [form.primaryCategory, ...form.categories].filter(Boolean), [form.primaryCategory, form.categories]);
  const subs = useMemo(() => cats.filter((c) => c.kind === 'sub' && selectedPillarIds.includes(String(c.parent?._id || c.parent))), [cats, selectedPillarIds]);

  // New items: default the primary area to the pillar matching the chosen type.
  useEffect(() => {
    if (isNew && !form.primaryCategory && pillars.length) {
      const match = pillars.find((p) => p.slug === form.type) || pillars[0];
      setForm((f) => ({ ...f, primaryCategory: match._id }));
    }
  }, [isNew, pillars, form.type, form.primaryCategory]);

  const payload = useCallback(() => {
    // Work URLs are generated and owned by the API. Keeping slugs out of the
    // editor prevents accidental URL breakage and duplicate-slug errors.
    const p = { ...form };
    delete p.slug;
    delete p.previousSlugs;
    p.categories = form.categories.filter((c) => c !== form.primaryCategory);
    p.subcategories = form.subcategories.filter((s) => subs.some((x) => x._id === s));
    if (!p.cover?.url) p.cover = null;
    return p;
  }, [form, subs]);

  async function save({ silent = false } = {}) {
    setError('');
    const body = payload();
    const doc = isNew ? await api('/works', { method: 'POST', body }) : await api(`/works/${id}`, { method: 'PUT', body });
    setForm((f) => ({ ...f, slug: doc.slug }));
    setMeta({ _id: doc._id, status: doc.status, updatedAt: doc.updatedAt, publishedAt: doc.publishedAt, isSample: doc.isSample });
    setDirty(false);
    if (!silent) toast.push('Saved');
    return doc;
  }

  const run = (name, fn) => async () => {
    setBusy(name); setError('');
    try { await fn(); } catch (e) { setError(e.message); toast.push(e.message, 'error'); } finally { setBusy(''); }
  };

  const onSave = run('save', async () => {
    const doc = await save();
    if (isNew) router.replace(`/admin/works/${doc._id}`);
  });
  const act = (action, label) => run(action, async () => {
    const doc = await save({ silent: true });
    const res = await api(`/works/${doc._id}/${action}`, { method: 'POST' });
    setMeta((m) => ({ ...m, status: res.status, publishedAt: res.publishedAt }));
    toast.push(label);
    if (isNew) router.replace(`/admin/works/${doc._id}`);
  });
  const onPreview = run('preview', async () => {
    const doc = await save({ silent: true });
    const { token, slug } = await api(`/works/${doc._id}/preview-token`);
    window.open(`/work/${slug}?preview=${encodeURIComponent(token)}`, '_blank', 'noopener');
    if (isNew) router.replace(`/admin/works/${doc._id}`);
  });
  const onDuplicate = run('duplicate', async () => {
    const copy = await api(`/works/${meta._id}/duplicate`, { method: 'POST' });
    toast.push('Duplicated as a draft');
    router.push(`/admin/works/${copy._id}`);
  });
  const onDelete = run('delete', async () => {
    await api(`/works/${meta._id}`, { method: 'DELETE' });
    toast.push('Draft deleted');
    router.push('/admin/works');
  });

  if (loading) return <p role="status">Loading…</p>;
  const status = meta?.status || 'draft';
  const t = form.type;

  return (
    <>
      <PageHeader title={isNew ? 'New work' : form.title || 'Edit work'} sub={meta ? `Last saved ${fmtDate(meta.updatedAt)}` : 'Not saved yet'}>
        <Link href="/admin/works" className="btn btn-quiet">Back to work</Link>
      </PageHeader>
      {error ? <p className="a-error" role="alert">{error}</p> : null}
      {meta?.isSample ? <p className="a-notice">This is sample content. Replace the text and images with your own, or delete it. It stays flagged on the dashboard until it is deleted.</p> : null}

      <div className="a-editor">
        <div className="a-editor-main">
          <section className="a-card">
            <h2>Basics</h2>
            <div className="a-grid">
              <SelectField label="What kind of work is this?" value={form.type} onChange={(v) => set('type', v)} options={TYPES} hint="Decides which fields and page layout are used." wide />
              <TextField label="Title" value={form.title} onChange={(v) => set('title', v)} wide required />
              {meta && form.slug ? <div className="a-field"><span className="a-label">Public URL</span><p className="a-hint"><a href={`/work/${form.slug}`} target="_blank" rel="noopener noreferrer">/work/{form.slug}</a> <span className="sr-only">(opens in a new tab)</span></p></div> : null}
              <TextField label="Year or date range" value={form.dateLabel} onChange={(v) => set('dateLabel', v)} placeholder="2026 or Mar to Jun 2026" />
              <TextArea label="Summary (shown on cards and in search results)" value={form.summary} onChange={(v) => set('summary', v)} rows={3} maxLength={500} hint="Required to publish. Be specific and truthful." />
            </div>
          </section>

          <section className="a-card">
            <h2>Images</h2>
            <ImageField label="Cover image (required to publish)" value={form.cover} onChange={(v) => set('cover', v)} hint="Write alt text that describes what the image shows." />
            <GalleryField label={t === 'design' ? 'Gallery (flyers, posters, logos)' : 'Screenshots and extra images'} value={form.gallery} onChange={(v) => set('gallery', v)}
              hint={t === 'design' ? 'Shown as a masonry gallery with a lightbox.' : 'Shown as a grid with a lightbox.'} />
          </section>

          {t === 'design' ? (
            <section className="a-card">
              <h2>Design details</h2>
              <div className="a-grid">
                <TextField label="Asset type" value={form.design.assetType} onChange={(v) => set('design.assetType', v)} placeholder="Flyer, poster, logo, social kit…" />
                <TextField label="Client (leave empty for personal work)" value={form.design.client} onChange={(v) => set('design.client', v)} />
                <TextArea label="Brief" value={form.design.brief} onChange={(v) => set('design.brief', v)} />
                <TextArea label="Process" value={form.design.process} onChange={(v) => set('design.process', v)} rows={5} hint="Optional. Add this for a larger case study." />
              </div>
            </section>
          ) : null}

          {t === 'development' ? (
            <section className="a-card">
              <h2>Software case study</h2>
              <div className="a-grid">
                <TextField label="Your role" value={form.development.role} onChange={(v) => set('development.role', v)} />
                <TextField label="Live URL" type="url" value={form.development.liveUrl} onChange={(v) => set('development.liveUrl', v)} placeholder="https://" hint="Only add if it is really deployed." />
                <TextField label="Repository URL" type="url" value={form.development.repoUrl} onChange={(v) => set('development.repoUrl', v)} placeholder="https://github.com/…" />
                <SelectField label="Project status" value={form.projectStatus} onChange={(v) => set('projectStatus', v)} options={PROJECT_STATUS} />
                <TagInput label="Stack (shown in the details bar)" value={form.development.stack} onChange={(v) => set('development.stack', v)} />
                <LineList label="Key features" value={form.development.features} onChange={(v) => set('development.features', v)} />
                <TextArea label="The problem" value={form.development.challenge} onChange={(v) => set('development.challenge', v)} />
                <TextArea label="The solution" value={form.development.solution} onChange={(v) => set('development.solution', v)} />
                <TextArea label="Architecture note" value={form.development.architecture} onChange={(v) => set('development.architecture', v)} />
                <TextArea label="Outcome" value={form.development.outcomes} onChange={(v) => set('development.outcomes', v)} hint="Only claim what happened. Do not imply clients, deployments or audits that did not occur." />
              </div>
            </section>
          ) : null}

          {t === 'marketing' ? (
            <section className="a-card">
              <h2>Campaign details</h2>
              <div className="a-grid">
                <TextField label="Brand or client" value={form.marketing.brand} onChange={(v) => set('marketing.brand', v)} />
                <TextField label="Your role" value={form.marketing.role} onChange={(v) => set('marketing.role', v)} />
                <TextField label="Duration" value={form.marketing.duration} onChange={(v) => set('marketing.duration', v)} placeholder="6 weeks" />
                <SelectField label="Project status" value={form.projectStatus} onChange={(v) => set('projectStatus', v)} options={PROJECT_STATUS} />
                <TagInput label="Channels and platforms" value={form.marketing.platforms} onChange={(v) => set('marketing.platforms', v)} />
                <TextArea label="Objective" value={form.marketing.objective} onChange={(v) => set('marketing.objective', v)} />
                <TextArea label="Outcome (narrative)" value={form.marketing.outcome} onChange={(v) => set('marketing.outcome', v)} hint="A narrative is fine without numbers." />
              </div>
              <Check label="I have permission to publish this client’s name, results and non-public details" checked={form.marketing.permissionConfirmed} onChange={(v) => set('marketing.permissionConfirmed', v)}
                hint="Without this, metrics and evidence links stay hidden on the public page." />
              <RowList label="Measured results (optional)" hint="Every metric needs context and a source. Never infer conversions from impressions. Leave empty if you have no verified numbers." value={form.marketing.metrics} onChange={(v) => set('marketing.metrics', v)} addLabel="Add metric"
                empty={{ label: '', value: '', unit: '', context: '', source: '', sourceType: 'owner-reported' }}
                fields={[{ name: 'label', label: 'Metric (e.g. Reach)' }, { name: 'value', label: 'Value (e.g. 12.4k)' }, { name: 'unit', label: 'Unit' }, { name: 'context', label: 'Period or context' }, { name: 'source', label: 'Source (report, dashboard, link)' }, { name: 'sourceType', label: 'Source type', type: 'select', options: [{ value: 'owner-reported', label: 'Owner-reported' }, { value: 'verified', label: 'Verified by a source' }] }]} />
              <RowList label="Evidence links" value={form.marketing.evidenceLinks} onChange={(v) => set('marketing.evidenceLinks', v)} addLabel="Add link" empty={{ label: '', url: '' }} fields={[{ name: 'label', label: 'Label' }, { name: 'url', label: 'URL', placeholder: 'https://' }]} />
            </section>
          ) : null}

          {t === 'web3' ? (
            <section className="a-card">
              <h2>Web3 and community details</h2>
              <div className="a-grid">
                <SelectField label="What is this?" value={form.web3.kind} onChange={(v) => set('web3.kind', v)} options={[{ value: 'community', label: 'Community or ambassador activity' }, { value: 'experiment', label: 'Experiment or testnet demo' }, { value: 'production', label: 'Production software' }]} hint="Visitors see this label, so be accurate." />
                <TextField label="Program or project" value={form.web3.program} onChange={(v) => set('web3.program', v)} />
                <TextField label="Your role" value={form.web3.role} onChange={(v) => set('web3.role', v)} />
                <TextField label="Chain or network" value={form.web3.network} onChange={(v) => set('web3.network', v)} placeholder="Ethereum, Base, Sepolia testnet…" />
                <TextField label="Block explorer URL" type="url" value={form.web3.explorerUrl} onChange={(v) => set('web3.explorerUrl', v)} />
                <TextField label="Repository URL" type="url" value={form.web3.repoUrl} onChange={(v) => set('web3.repoUrl', v)} />
                <TextField label="Contract address (if relevant)" value={form.web3.contractAddress} onChange={(v) => set('web3.contractAddress', v)} />
                <TextArea label="Disclaimer shown on the page" value={form.web3.disclaimer} onChange={(v) => set('web3.disclaimer', v)} rows={2} hint="For example: “Testnet experiment, not a production deployment.”" />
              </div>
              <Check label="The contract is verified on the block explorer" checked={form.web3.contractVerified} onChange={(v) => set('web3.contractVerified', v)} />
              <RowList label="Evidence links" value={form.web3.evidenceLinks} onChange={(v) => set('web3.evidenceLinks', v)} addLabel="Add link" empty={{ label: '', url: '' }} fields={[{ name: 'label', label: 'Label' }, { name: 'url', label: 'URL', placeholder: 'https://' }]} />
            </section>
          ) : null}

          <section className="a-card">
            <h2>Story</h2>
            <TextArea label="Overview (Markdown supported)" value={form.body} onChange={(v) => set('body', v)} rows={10} hint="Use **bold**, *italic*, lists and [links](https://…). Raw HTML is not rendered." />
          </section>

          <section className="a-card">
            <h2>Search and sharing</h2>
            <div className="a-grid">
              <TextField label="SEO title (optional)" value={form.seo.title} onChange={(v) => set('seo.title', v)} hint="Defaults to the title." />
              <TextField label="Social image URL (optional)" value={form.seo.ogImage} onChange={(v) => set('seo.ogImage', v)} hint="Defaults to the cover image." />
              <TextArea label="SEO description (optional)" value={form.seo.description} onChange={(v) => set('seo.description', v)} rows={2} hint="Defaults to the summary. Aim for under 160 characters." />
            </div>
          </section>
        </div>

        <aside className="a-editor-side">
          <section className="a-card a-sticky">
            <h2>Publishing</h2>
            <p>Status: <StatusBadge status={status} />{meta?.publishedAt ? <span className="a-hint"> since {fmtDate(meta.publishedAt)}</span> : null}</p>
            <div className="a-stack">
              <button type="button" className="btn btn-primary" onClick={onSave} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : dirty ? 'Save changes' : 'Save'}</button>
              <button type="button" className="btn btn-quiet" onClick={onPreview} disabled={Boolean(busy)}>Preview</button>
              {status === 'draft' ? <button type="button" className="btn btn-quiet" onClick={act('publish', 'Published')} disabled={Boolean(busy)}>{busy === 'publish' ? 'Publishing…' : 'Publish'}</button> : null}
              {status === 'published' ? <button type="button" className="btn btn-quiet" onClick={act('unpublish', 'Moved back to draft')} disabled={Boolean(busy)}>Unpublish</button> : null}
              {status !== 'archived' && !isNew ? <Confirm className="btn btn-quiet" message="Archived work disappears from the site but keeps its history. You can restore it later." onConfirm={act('archive', 'Archived')}>Archive</Confirm> : null}
              {status === 'archived' ? <button type="button" className="btn btn-quiet" onClick={act('restore', 'Restored as a draft')} disabled={Boolean(busy)}>Restore as draft</button> : null}
              {!isNew ? <button type="button" className="btn btn-quiet" onClick={onDuplicate} disabled={Boolean(busy)}>Duplicate as draft</button> : null}
              {status === 'draft' && !isNew ? <Confirm className="btn btn-quiet a-danger" message="This permanently deletes the draft. Published work must be archived instead." onConfirm={onDelete}>Delete draft</Confirm> : null}
            </div>
            {status === 'published' ? <p className="a-hint"><Link href={`/work/${form.slug}`} target="_blank">View live page</Link></p> : null}
          </section>

          <section className="a-card">
            <h2>Where it appears</h2>
            <SelectField label="Primary area" value={form.primaryCategory} onChange={(v) => set('primaryCategory', v)} options={pillars.map((p) => ({ value: p._id, label: p.name }))} />
            <fieldset className="a-checks">
              <legend>Also show under</legend>
              {pillars.filter((p) => p._id !== form.primaryCategory).map((p) => (
                <Check key={p._id} label={p.name} checked={form.categories.includes(p._id)} onChange={(on) => set('categories', on ? [...form.categories, p._id] : form.categories.filter((c) => c !== p._id))} />
              ))}
              <p className="a-hint">One page, one URL, listed in every area you tick.</p>
            </fieldset>
            {subs.length ? (
              <fieldset className="a-checks">
                <legend>Subcategories</legend>
                {subs.map((s) => (
                  <Check key={s._id} label={s.name} checked={form.subcategories.includes(s._id)} onChange={(on) => set('subcategories', on ? [...form.subcategories, s._id] : form.subcategories.filter((c) => c !== s._id))} />
                ))}
              </fieldset>
            ) : null}
            <TagInput label="Tags" value={form.tags} onChange={(v) => set('tags', v)} />
            <TagInput label="Technologies or tools (filterable)" value={form.technologies} onChange={(v) => set('technologies', v)} />
          </section>

          <section className="a-card">
            <h2>Visibility</h2>
            <SelectField label="Listing" value={form.visibility} onChange={(v) => set('visibility', v)} options={[{ value: 'public', label: 'Listed publicly' }, { value: 'unlisted', label: 'Unlisted (link only, not indexed)' }]} />
            <Check label="Feature on the home page" checked={form.featured} onChange={(v) => set('featured', v)} />
            {form.featured ? <TextField label="Featured position (1 = first)" type="number" value={form.featuredOrder} onChange={(v) => set('featuredOrder', v)} /> : null}
            {t === 'design' || t === 'web3' ? <SelectField label="Project status" value={form.projectStatus} onChange={(v) => set('projectStatus', v)} options={PROJECT_STATUS} /> : null}
          </section>
        </aside>
      </div>
    </>
  );
}
