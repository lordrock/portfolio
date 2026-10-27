import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { reorderSchema } from '../../schemas/index.js';
import { uniqueSlug, slugify } from '../../lib/slug.js';

const clampInt = (v, d, min, max) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || d));
const one = (v) => (typeof v === 'string' ? v : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Generic CRUD router used by the simpler resources.
 * options: { Model, schema, entity, sort, searchFields, filters(req)->query, populate, slugFrom, beforeDelete, beforeSave }
 */
export function crudRouter(opts) {
  const { Model, schema, entity, sort = { order: 1, createdAt: -1 }, searchFields = [], populate, slugFrom, beforeDelete, beforeSave, filters } = opts;
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const q = {};
      const search = one(req.query.q).trim();
      if (search && searchFields.length) q.$or = searchFields.map((f) => ({ [f]: new RegExp(escapeRegex(search), 'i') }));
      Object.assign(q, filters ? filters(req) : {});
      const page = clampInt(req.query.page, 1, 1, 10_000);
      const limit = clampInt(req.query.limit, 100, 1, 200);
      const [items, total] = await Promise.all([
        Model.find(q).sort(sort).skip((page - 1) * limit).limit(limit).populate(populate || '').lean(),
        Model.countDocuments(q),
      ]);
      res.json({ items, total, page, limit });
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).populate(populate || '').lean();
      if (!doc) throw notFound(entity);
      res.json(doc);
    })
  );

  r.post(
    '/',
    validate(schema),
    asyncHandler(async (req, res) => {
      const data = { ...req.body };
      if (slugFrom) {
        if (data.slug) {
          data.slug = slugify(data.slug);
          if (await Model.exists({ slug: data.slug })) return res.status(409).json({ error: `Slug "${data.slug}" is already in use.` });
        } else {
          data.slug = await uniqueSlug(Model, data[slugFrom]);
        }
      }
      if (beforeSave) await beforeSave(data, null);
      const doc = await Model.create(data);
      await audit(req, 'create', entity, doc._id, data[slugFrom] || '');
      res.status(201).json(doc);
    })
  );

  r.put(
    '/:id',
    validate(schema),
    asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw notFound(entity);
      const data = { ...req.body };
      if (slugFrom) {
        const wanted = slugify(data.slug || doc.slug);
        if (wanted !== doc.slug) {
          if (await Model.exists({ slug: wanted, _id: { $ne: doc._id } })) {
            return res.status(409).json({ error: `Slug "${wanted}" is already in use.` });
          }
          data.slug = wanted;
        } else {
          data.slug = doc.slug;
        }
      }
      if (beforeSave) await beforeSave(data, doc);
      doc.set(data);
      await doc.save();
      await audit(req, 'update', entity, doc._id, doc[slugFrom] || '');
      res.json(doc);
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw notFound(entity);
      if (beforeDelete) await beforeDelete(doc);
      await doc.deleteOne();
      await audit(req, 'delete', entity, doc._id, '');
      res.json({ ok: true });
    })
  );

  if (Model.schema.path('order')) {
    r.patch(
      '/reorder/batch',
      validate(reorderSchema),
      asyncHandler(async (req, res) => {
        await Model.bulkWrite(req.body.items.map((i) => ({ updateOne: { filter: { _id: i.id }, update: { $set: { order: i.order } } } })));
        await audit(req, 'reorder', entity, '', `${req.body.items.length} items`);
        res.json({ ok: true });
      })
    );
  }

  return r;
}
