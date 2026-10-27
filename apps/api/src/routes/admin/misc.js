import { Router } from 'express';
import multer from 'multer';
import { AuditLog, Article, Category, Inquiry, Media, Profile, Testimonial, Work } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { inquiryUpdateSchema, mediaUpdateSchema, profileSchema, resumeSchema } from '../../schemas/index.js';
import { removeStored, storeFile } from '../../lib/storage.js';
import { uploadLimiter } from '../../middleware/rateLimits.js';
import { env } from '../../config/env.js';

const clamp = (v, d, min, max) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || d));
const one = (v) => (typeof v === 'string' ? v : '');

/* ---------------------------------------------------------------- Overview */
export const overview = Router();
overview.get(
  '/',
  asyncHandler(async (req, res) => {
    const [byStatus, byPillar, newInquiries, totalInquiries, pendingTestimonials, articles, samples, recent, recentInquiries, activity, mediaCount] =
      await Promise.all([
        Work.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Work.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$primaryCategory', n: { $sum: 1 } } }]),
        Inquiry.countDocuments({ status: 'new' }),
        Inquiry.countDocuments(),
        Testimonial.countDocuments({ approved: false }),
        Article.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Work.countDocuments({ isSample: true }),
        Work.find().sort({ updatedAt: -1 }).limit(6).select('title slug type status updatedAt cover').lean(),
        Inquiry.find().sort({ createdAt: -1 }).limit(5).select('name topic status createdAt').lean(),
        AuditLog.find().sort({ at: -1 }).limit(8).lean(),
        Media.countDocuments(),
      ]);
    const pillars = await Category.find({ kind: 'pillar' }).sort({ order: 1 }).select('name slug').lean();
    const pillarCounts = pillars.map((p) => ({ ...p, published: byPillar.find((x) => String(x._id) === String(p._id))?.n || 0 }));
    const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.n]));
    res.json({
      works: { draft: 0, published: 0, archived: 0, ...toMap(byStatus) },
      articles: { draft: 0, published: 0, archived: 0, ...toMap(articles) },
      pillars: pillarCounts,
      inquiries: { new: newInquiries, total: totalInquiries },
      testimonialsPending: pendingTestimonials,
      sampleWorks: samples,
      media: mediaCount,
      recentWorks: recent,
      recentInquiries,
      activity,
      storage: env.cloudinaryEnabled ? 'cloudinary' : 'local',
      email: env.emailEnabled ? 'configured' : 'not-configured',
    });
  })
);

/* ----------------------------------------------------------------- Profile */
export const profile = Router();
profile.get(
  '/',
  asyncHandler(async (req, res) => {
    const doc = (await Profile.findOne({ key: 'site' }).lean()) || (await Profile.create({ key: 'site' })).toObject();
    res.json(doc);
  })
);
profile.put(
  '/',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    const update = { $set: data };
    if (!data.photo) { delete data.photo; update.$unset = { photo: 1 }; }
    const doc = await Profile.findOneAndUpdate({ key: 'site' }, update, { new: true, upsert: true, runValidators: true });
    await audit(req, 'update', 'Profile', doc._id, 'site profile');
    res.json(doc);
  })
);
profile.put(
  '/resume',
  validate(resumeSchema),
  asyncHandler(async (req, res) => {
    const doc = await Profile.findOneAndUpdate(
      { key: 'site' },
      { $set: { 'resume.url': req.body.url, 'resume.publicId': req.body.publicId, 'resume.filename': req.body.filename, 'resume.updatedAt': new Date() } },
      { new: true, upsert: true }
    );
    await audit(req, 'update', 'Resume', doc._id, req.body.filename || '');
    res.json(doc.resume);
  })
);
profile.delete(
  '/resume',
  asyncHandler(async (req, res) => {
    await Profile.updateOne({ key: 'site' }, { $unset: { 'resume.url': 1, 'resume.publicId': 1, 'resume.filename': 1, 'resume.updatedAt': 1 } });
    res.json({ ok: true });
  })
);

/* --------------------------------------------------------------- Inquiries */
export const inquiries = Router();
inquiries.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = ['new', 'read', 'archived'].includes(one(req.query.status)) ? { status: req.query.status } : {};
    const page = clamp(req.query.page, 1, 1, 10_000);
    const limit = clamp(req.query.limit, 30, 1, 100);
    const [items, total] = await Promise.all([
      Inquiry.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-ipHash -userAgent').lean(),
      Inquiry.countDocuments(q),
    ]);
    res.json({ items, total, page, limit });
  })
);
inquiries.patch(
  '/:id',
  validate(inquiryUpdateSchema),
  asyncHandler(async (req, res) => {
    const doc = await Inquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select('-ipHash -userAgent');
    if (!doc) throw notFound('Inquiry');
    res.json(doc);
  })
);
inquiries.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Inquiry.findByIdAndDelete(req.params.id);
    if (!doc) throw notFound('Inquiry');
    await audit(req, 'delete', 'Inquiry', doc._id, 'retention/deletion');
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------- Media */
export const media = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Math.max(env.MAX_IMAGE_MB, env.MAX_DOC_MB) * 1024 * 1024, files: 1 } });

media.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = {};
    if (one(req.query.type) === 'image') q.resourceType = 'image';
    if (one(req.query.type) === 'document') q.resourceType = 'raw';
    const page = clamp(req.query.page, 1, 1, 10_000);
    const limit = clamp(req.query.limit, 40, 1, 100);
    const [items, total] = await Promise.all([
      Media.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Media.countDocuments(q),
    ]);
    res.json({ items, total, page, limit });
  })
);
media.post(
  '/',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received (field name must be "file")' });
    const kind = one(req.query.kind) === 'document' ? 'document' : 'image';
    const stored = await storeFile({ buffer: req.file.buffer, originalName: req.file.originalname, kind });
    const doc = await Media.create({ ...stored, filename: req.file.originalname.slice(0, 200), alt: one(req.body?.alt).slice(0, 300) });
    await audit(req, 'upload', 'Media', doc._id, doc.filename);
    res.status(201).json(doc);
  })
);
media.patch(
  '/:id',
  validate(mediaUpdateSchema),
  asyncHandler(async (req, res) => {
    const doc = await Media.findByIdAndUpdate(req.params.id, { alt: req.body.alt }, { new: true });
    if (!doc) throw notFound('Media');
    res.json(doc);
  })
);
media.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await Media.findById(req.params.id);
    if (!doc) throw notFound('Media');
    await removeStored(doc);
    await doc.deleteOne();
    await audit(req, 'delete', 'Media', doc._id, doc.filename);
    res.json({ ok: true });
  })
);
