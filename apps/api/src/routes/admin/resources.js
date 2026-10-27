import { Router } from 'express';
import { Article, Category, Experience, Service, Skill, Testimonial, Work } from '../../models/index.js';
import { crudRouter } from './crud.js';
import { asyncHandler, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { uniqueSlug } from '../../lib/slug.js';
import * as S from '../../schemas/index.js';

export const categories = crudRouter({
  Model: Category,
  schema: S.categorySchema,
  entity: 'Category',
  slugFrom: 'name',
  sort: { kind: 1, order: 1, name: 1 },
  populate: { path: 'parent', select: 'name slug' },
  async beforeSave(data) {
    if (data.kind === 'sub') {
      const parent = data.parent && (await Category.findById(data.parent).lean());
      if (!parent || parent.kind !== 'pillar') throw Object.assign(new Error('A subcategory needs a pillar as parent'), { status: 400 });
    } else {
      data.parent = null;
    }
  },
  async beforeDelete(doc) {
    if (doc.kind === 'pillar') throw Object.assign(new Error('The four core pillars cannot be deleted. Rename them instead.'), { status: 409 });
    const used = await Work.countDocuments({ subcategories: doc._id });
    if (used) throw Object.assign(new Error(`This subcategory is used by ${used} work item(s). Remove it from them first.`), { status: 409 });
  },
});

export const services = crudRouter({
  Model: Service,
  schema: S.serviceSchema,
  entity: 'Service',
  slugFrom: 'title',
  searchFields: ['title'],
  populate: { path: 'pillar', select: 'name slug' },
});

export const testimonials = crudRouter({
  Model: Testimonial,
  schema: S.testimonialSchema,
  entity: 'Testimonial',
  searchFields: ['authorName', 'company'],
  populate: { path: 'work', select: 'title slug' },
  beforeSave(data) {
    // A testimonial can only be public when permission is confirmed.
    if (data.approved && !data.permissionConfirmed) {
      throw Object.assign(new Error('Confirm you have permission to publish this testimonial before approving it.'), { status: 422 });
    }
  },
});

export const experience = crudRouter({ Model: Experience, schema: S.experienceSchema, entity: 'Experience', searchFields: ['role', 'organization'] });
export const skills = crudRouter({ Model: Skill, schema: S.skillSchema, entity: 'Skill', searchFields: ['name', 'group'], sort: { group: 1, order: 1, name: 1 } });

/* Articles: crud + publish lifecycle */
const articleBase = crudRouter({
  Model: Article,
  schema: S.articleSchema,
  entity: 'Article',
  slugFrom: 'title',
  searchFields: ['title'],
  sort: { updatedAt: -1 },
  filters: (req) => (['draft', 'published', 'archived'].includes(req.query.status) ? { status: req.query.status } : {}),
  async beforeDelete(doc) {
    if (doc.status !== 'draft') throw Object.assign(new Error('Only drafts can be deleted. Archive instead.'), { status: 409 });
  },
});
export const articles = Router();
articles.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const src = await Article.findById(req.params.id).lean();
    if (!src) throw notFound('Article');
    const { _id, createdAt, updatedAt, __v, publishedAt, ...rest } = src;
    const copy = await Article.create({
      ...rest,
      title: `${src.title} (copy)`,
      slug: await uniqueSlug(Article, `${src.slug}-copy`),
      status: 'draft',
    });
    await audit(req, 'duplicate', 'Article', copy._id, copy.title);
    res.status(201).json(copy);
  })
);
for (const [name, from, to] of [['publish', ['draft'], 'published'], ['unpublish', ['published'], 'draft'], ['archive', ['draft', 'published'], 'archived'], ['restore', ['archived'], 'draft']]) {
  articles.post(
    `/:id/${name}`,
    asyncHandler(async (req, res) => {
      const doc = await Article.findById(req.params.id);
      if (!doc) throw notFound('Article');
      if (!from.includes(doc.status)) return res.status(409).json({ error: `Cannot ${name} a ${doc.status} article` });
      if (name === 'publish' && (!doc.excerpt || doc.body.trim().length < 80)) {
        return res.status(422).json({ error: 'Add an excerpt and a body before publishing.' });
      }
      doc.status = to;
      if (name === 'publish') doc.publishedAt = doc.publishedAt || new Date();
      await doc.save();
      await audit(req, name, 'Article', doc._id, doc.title);
      res.json(doc);
    })
  );
}
articles.use('/', articleBase);
