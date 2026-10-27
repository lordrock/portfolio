import { Router } from 'express';
import { Category, Work, Testimonial } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { workSchema } from '../../schemas/index.js';
import { slugify, uniqueSlug } from '../../lib/slug.js';
import { signPreview } from '../../lib/tokens.js';

const r = Router();
const one = (v) => (typeof v === 'string' ? v : '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function checkCategories(data) {
  const ids = [data.primaryCategory, ...(data.categories || []), ...(data.subcategories || [])];
  const found = await Category.find({ _id: { $in: ids } }).select('_id kind').lean();
  const map = new Map(found.map((c) => [String(c._id), c]));
  if (map.get(data.primaryCategory)?.kind !== 'pillar') return 'Primary category must be one of the top-level pillars';
  if ((data.categories || []).some((id) => map.get(id)?.kind !== 'pillar')) return 'Additional categories must be pillars';
  if ((data.subcategories || []).some((id) => map.get(id)?.kind !== 'sub')) return 'Invalid subcategory';
  return null;
}

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = {};
    if (['draft', 'published', 'archived'].includes(one(req.query.status))) q.status = req.query.status;
    if (['design', 'development', 'marketing', 'web3'].includes(one(req.query.type))) q.type = req.query.type;
    const s = one(req.query.q).trim();
    if (s) q.title = new RegExp(esc(s), 'i');
    const items = await Work.find(q)
      .sort({ updatedAt: -1 })
      .limit(300)
      .select('title slug type status visibility featured featuredOrder cover primaryCategory categories updatedAt publishedAt isSample')
      .populate('primaryCategory', 'name slug')
      .lean();
    res.json({ items, total: items.length });
  })
);

r.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Work.findById(req.params.id).lean();
    if (!doc) throw notFound('Work');
    res.json(doc);
  })
);

r.post(
  '/',
  validate(workSchema),
  asyncHandler(async (req, res) => {
    const bad = await checkCategories(req.body);
    if (bad) return res.status(400).json({ error: bad });
    const data = { ...req.body, status: 'draft' };
    if (data.slug) {
      data.slug = slugify(data.slug);
      if (await Work.exists({ slug: data.slug })) return res.status(409).json({ error: `Slug "${data.slug}" is already in use.` });
    } else {
      data.slug = await uniqueSlug(Work, data.title);
    }
    if (!data.cover) delete data.cover;
    const doc = await Work.create(data);
    await audit(req, 'create', 'Work', doc._id, doc.title);
    res.status(201).json(doc);
  })
);

r.put(
  '/:id',
  validate(workSchema),
  asyncHandler(async (req, res) => {
    const doc = await Work.findById(req.params.id);
    if (!doc) throw notFound('Work');
    const bad = await checkCategories(req.body);
    if (bad) return res.status(400).json({ error: bad });

    const data = { ...req.body };
    const wanted = slugify(data.slug || doc.slug);
    if (wanted !== doc.slug) {
      if (await Work.exists({ slug: wanted, _id: { $ne: doc._id } })) {
        return res.status(409).json({ error: `Slug "${wanted}" is already in use.` });
      }
      // Preserve inbound links: old URL will redirect to the new canonical one.
      if (doc.status === 'published') doc.previousSlugs = [...new Set([...doc.previousSlugs, doc.slug])].filter((s) => s !== wanted);
    }
    data.slug = wanted;
    if (!data.cover) data.cover = undefined;
    doc.set(data);
    await doc.save();
    await audit(req, 'update', 'Work', doc._id, doc.title);
    res.json(doc);
  })
);

const transition = (name, from, to, extra = () => ({})) =>
  r.post(
    `/:id/${name}`,
    asyncHandler(async (req, res) => {
      const doc = await Work.findById(req.params.id);
      if (!doc) throw notFound('Work');
      if (!from.includes(doc.status)) return res.status(409).json({ error: `Cannot ${name} a ${doc.status} item` });
      if (name === 'publish') {
        if (!doc.summary || !doc.cover?.url) {
          return res.status(422).json({ error: 'Add a summary and a cover image before publishing.' });
        }
        if (doc.type === 'design' && doc.gallery.length === 0 && !doc.cover?.url) {
          return res.status(422).json({ error: 'Design works need at least one image.' });
        }
      }
      doc.status = to;
      Object.assign(doc, extra(doc));
      await doc.save();
      await audit(req, name, 'Work', doc._id, doc.title);
      res.json(doc);
    })
  );

transition('publish', ['draft'], 'published', (d) => ({ publishedAt: d.publishedAt || new Date() }));
transition('unpublish', ['published'], 'draft');
transition('archive', ['published', 'draft'], 'archived');
transition('restore', ['archived'], 'draft');

r.get(
  '/:id/preview-token',
  asyncHandler(async (req, res) => {
    const doc = await Work.findById(req.params.id).select('slug');
    if (!doc) throw notFound('Work');
    res.json({ token: signPreview(doc._id), slug: doc.slug, expiresInMinutes: 30 });
  })
);

r.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const src = await Work.findById(req.params.id).lean();
    if (!src) throw notFound('Work');
    const { _id, createdAt, updatedAt, __v, publishedAt, previousSlugs, ...rest } = src;
    const copy = await Work.create({
      ...rest,
      title: `${src.title} (copy)`,
      slug: await uniqueSlug(Work, `${src.slug}-copy`),
      status: 'draft',
      featured: false,
    });
    await audit(req, 'duplicate', 'Work', copy._id, copy.title);
    res.status(201).json(copy);
  })
);

r.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Work.findById(req.params.id);
    if (!doc) throw notFound('Work');
    if (doc.status !== 'draft') {
      return res.status(409).json({ error: 'Only drafts can be deleted. Archive published work instead to keep history.' });
    }
    await Testimonial.updateMany({ work: doc._id }, { $unset: { work: 1 } });
    await doc.deleteOne();
    await audit(req, 'delete', 'Work', doc._id, doc.title);
    res.json({ ok: true });
  })
);

export default r;
