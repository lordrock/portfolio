import { Router } from 'express';
import crypto from 'node:crypto';
import { Article, Category, Experience, Inquiry, Profile, Service, Skill, Testimonial, Work } from '../models/index.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { inquiryLimiter, inquirySharedLimiter } from '../middleware/rateLimits.js';
import { inquirySchema } from '../schemas/index.js';
import { verifyPreview } from '../lib/tokens.js';
import { notifyOwnerOfInquiry } from '../lib/email.js';
import { env } from '../config/env.js';

const r = Router();
const one = (v) => (typeof v === 'string' ? v : '');
const clamp = (v, d, min, max) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || d));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cache hints: the Next.js server revalidates; browsers may hold briefly.
r.use((req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
  next();
});

const CARD_FIELDS =
  'type title slug summary cover tags technologies primaryCategory categories subcategories featured featuredOrder projectStatus publishedAt dateLabel design.assetType gallery';

/** Trim a work to what listings need (gallery limited to a count + first few thumbs). */
function toCard(w) {
  const { gallery = [], ...rest } = w;
  return { ...rest, galleryCount: gallery.length, galleryPreview: gallery.slice(0, 3) };
}

/** Marketing metrics are only exposed when present; never defaulted. Hide private client detail unless permission confirmed. */
function sanitizeWork(w) {
  if (w.marketing && !w.marketing.permissionConfirmed) {
    w.marketing = { ...w.marketing, metrics: [], evidenceLinks: [] };
  }
  return w;
}

/* ------------------------------------------------------------------- Site */
r.get(
  '/site',
  asyncHandler(async (req, res) => {
    const [profile, pillars, subs, works, articleCount] = await Promise.all([
      Profile.findOne({ key: 'site' }).select('-resume.publicId -resume.downloads -__v').lean(),
      Category.find({ kind: 'pillar' }).sort({ order: 1 }).lean(),
      Category.find({ kind: 'sub' }).sort({ order: 1, name: 1 }).lean(),
      Work.find({ status: 'published', visibility: 'public' }).select('primaryCategory categories subcategories').lean(),
      Article.countDocuments({ status: 'published' }),
    ]);
    const pc = new Map();
    const sc = new Map();
    const bump = (m, id) => m.set(String(id), (m.get(String(id)) || 0) + 1);
    for (const w of works) {
      new Set([w.primaryCategory, ...(w.categories || [])].filter(Boolean).map(String)).forEach((id) => bump(pc, id));
      (w.subcategories || []).forEach((id) => bump(sc, id));
    }
    res.json({
      profile: profile || null,
      pillars: pillars.map((p) => ({ ...p, count: pc.get(String(p._id)) || 0 })),
      subcategories: subs.map((s) => ({ ...s, count: sc.get(String(s._id)) || 0 })).filter((s) => s.count > 0),
      hasArticles: articleCount > 0, // Articles nav only appears once there's something to read
      siteUrl: env.publicSiteUrl,
    });
  })
);

/* ------------------------------------------------------------------- Work */
r.get(
  '/works',
  asyncHandler(async (req, res) => {
    const q = { status: 'published', visibility: 'public' };
    const pillar = one(req.query.pillar);
    if (pillar) {
      const p = await Category.findOne({ slug: pillar, kind: 'pillar' }).select('_id').lean();
      if (!p) return res.json({ items: [], total: 0, page: 1, limit: 12 });
      q.$or = [{ primaryCategory: p._id }, { categories: p._id }];
    }
    const sub = one(req.query.sub);
    if (sub) {
      const s = await Category.findOne({ slug: sub, kind: 'sub' }).select('_id').lean();
      if (!s) return res.json({ items: [], total: 0, page: 1, limit: 12 });
      q.subcategories = s._id;
    }
    const tech = one(req.query.tech).trim();
    if (tech) q.$and = [...(q.$and || []), { $or: [{ technologies: new RegExp(`^${esc(tech)}$`, 'i') }, { tags: new RegExp(`^${esc(tech)}$`, 'i') }] }];
    if (['design', 'development', 'marketing', 'web3'].includes(one(req.query.type))) q.type = req.query.type;
    if (one(req.query.featured) === '1') q.featured = true;

    const search = one(req.query.q).trim().slice(0, 80);
    if (search) {
      const rx = new RegExp(esc(search), 'i');
      q.$and = [...(q.$and || []), { $or: [{ title: rx }, { summary: rx }, { tags: rx }, { technologies: rx }] }];
    }

    const sorts = {
      featured: { featured: -1, featuredOrder: 1, publishedAt: -1 },
      newest: { publishedAt: -1 },
      oldest: { publishedAt: 1 },
      az: { title: 1 },
    };
    const sort = sorts[one(req.query.sort)] || (q.featured ? sorts.featured : { order: 1, publishedAt: -1 });
    const page = clamp(req.query.page, 1, 1, 1000);
    const limit = clamp(req.query.limit, 12, 1, 48);

    const [items, total] = await Promise.all([
      Work.find(q).sort(sort).skip((page - 1) * limit).limit(limit).select(CARD_FIELDS).populate('primaryCategory', 'name slug').populate('subcategories', 'name slug').lean(),
      Work.countDocuments(q),
    ]);
    res.json({ items: items.map(toCard), total, page, limit });
  })
);

r.get(
  '/works/featured',
  asyncHandler(async (req, res) => {
    const items = await Work.find({ status: 'published', visibility: 'public', featured: true })
      .sort({ featuredOrder: 1, publishedAt: -1 })
      .limit(clamp(req.query.limit, 6, 1, 12))
      .select(CARD_FIELDS)
      .populate('primaryCategory', 'name slug')
      .lean();
    res.json({ items: items.map(toCard) });
  })
);

r.get(
  '/works/facets',
  asyncHandler(async (req, res) => {
    const works = await Work.find({ status: 'published', visibility: 'public' }).select('technologies').lean();
    const counts = new Map();
    for (const w of works) for (const t of new Set(w.technologies || [])) counts.set(t, (counts.get(t) || 0) + 1);
    const technologies = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    res.json({ technologies });
  })
);

r.get(
  '/works/slugs',
  asyncHandler(async (req, res) => {
    const items = await Work.find({ status: 'published', visibility: 'public' }).select('slug updatedAt').lean();
    res.json({ items });
  })
);

r.get(
  '/works/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    let work = await Work.findOne({ slug }).populate('primaryCategory categories subcategories', 'name slug kind').lean();
    const preview = one(req.query.preview);

    if (!work) {
      // Renamed? Tell the web app where it lives now (permanent redirect).
      const moved = await Work.findOne({ previousSlugs: slug, status: 'published' }).select('slug').lean();
      if (moved) return res.json({ redirectTo: moved.slug });
      throw notFound('Work');
    }
    const isPreview = preview && verifyPreview(preview, work._id);
    if (work.status !== 'published' && !isPreview) throw notFound('Work');
    if (isPreview) res.set('Cache-Control', 'no-store');

    const pillarIds = [work.primaryCategory?._id, ...(work.categories || []).map((c) => c._id)].filter(Boolean);
    const related = await Work.find({
      status: 'published',
      visibility: 'public',
      _id: { $ne: work._id },
      $or: [{ tags: { $in: work.tags } }, { technologies: { $in: work.technologies } }, { primaryCategory: { $in: pillarIds } }],
    })
      .sort({ featured: -1, publishedAt: -1 })
      .limit(3)
      .select(CARD_FIELDS)
      .populate('primaryCategory', 'name slug')
      .lean();

    res.json({ work: sanitizeWork(work), related: related.map(toCard), preview: Boolean(isPreview) });
  })
);

/* ----------------------------------------------------------- Static lists */
r.get(
  '/services',
  asyncHandler(async (req, res) => {
    const items = await Service.find({ published: true }).sort({ order: 1 }).populate('pillar', 'name slug').lean();
    res.json({ items });
  })
);

r.get(
  '/testimonials',
  asyncHandler(async (req, res) => {
    const items = await Testimonial.find({ approved: true, permissionConfirmed: true }).sort({ order: 1 }).select('-isSample -permissionConfirmed').populate('work', 'title slug').lean();
    res.json({ items });
  })
);

r.get('/experience', asyncHandler(async (req, res) => res.json({ items: await Experience.find({ visible: true }).sort({ order: 1 }).lean() })));
r.get('/skills', asyncHandler(async (req, res) => res.json({ items: await Skill.find().sort({ group: 1, order: 1, name: 1 }).lean() })));

/* --------------------------------------------------------------- Articles */
r.get(
  '/articles',
  asyncHandler(async (req, res) => {
    const items = await Article.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(50).select('-body').lean();
    res.json({ items });
  })
);
r.get(
  '/articles/:slug',
  asyncHandler(async (req, res) => {
    const a = await Article.findOne({ slug: req.params.slug.toLowerCase(), status: 'published' }).lean();
    if (!a) throw notFound('Article');
    res.json({ article: a });
  })
);

/* ----------------------------------------------------------------- Resume */
r.get(
  '/resume',
  asyncHandler(async (req, res) => {
    const p = await Profile.findOneAndUpdate({ key: 'site', 'resume.url': { $exists: true } }, { $inc: { 'resume.downloads': 1 } }, { new: true }).select('resume.url').lean();
    if (!p?.resume?.url) throw notFound('Resume');
    res.set('Cache-Control', 'no-store');
    res.json({ url: p.resume.url });
  })
);

/* -------------------------------------------------------------- Inquiries */
r.post(
  '/inquiries',
  inquiryLimiter,
  inquirySharedLimiter,
  validate(inquirySchema),
  asyncHandler(async (req, res) => {
    const { website, startedAt, ...data } = req.body;

    // Spam controls: honeypot, time trap, link stuffing. Respond "ok" so bots learn nothing.
    const tooFast = typeof startedAt === 'number' && Date.now() - startedAt < 2500;
    const links = (data.message.match(/https?:\/\//gi) || []).length;
    if (website || tooFast || links > 3) return res.status(202).json({ ok: true });

    const inquiry = await Inquiry.create({
      ...data,
      ipHash: crypto.createHash('sha256').update(`${req.ip}|${env.JWT_SECRET}`).digest('hex').slice(0, 24),
      userAgent: String(req.get('user-agent') || '').slice(0, 200),
    });
    inquiry.notified = await notifyOwnerOfInquiry(inquiry);
    await inquiry.save();
    res.status(201).json({ ok: true });
  })
);

export default r;
