import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import publicRoutes from './public.js';
import authRoutes from './admin/auth.js';
import worksRoutes from './admin/works.js';
import * as resources from './admin/resources.js';
import * as misc from './admin/misc.js';
import { pingRevalidate } from '../lib/revalidate.js';
import { clearPublicCache, publicCacheStats } from '../middleware/responseCache.js';

const api = Router();

api.get('/health', async (req, res) => {
  const { default: mongoose } = await import('mongoose');
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(database === 'connected' ? 200 : 503).json({ ok: database === 'connected', database, cache: publicCacheStats(), time: new Date().toISOString() });
});
api.use('/public', publicRoutes);

api.use('/admin/auth', authRoutes);
const admin = Router();
admin.use(requireAdmin);
// After any successful admin write, tell the website to drop its cached pages so unpublished content disappears immediately.
admin.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => {
    if (res.statusCode < 300) {
      clearPublicCache();
      pingRevalidate();
    }
  });
  next();
});
admin.use('/overview', misc.overview);
admin.use('/works', worksRoutes);
admin.use('/categories', resources.categories);
admin.use('/services', resources.services);
admin.use('/testimonials', resources.testimonials);
admin.use('/experience', resources.experience);
admin.use('/skills', resources.skills);
admin.use('/articles', resources.articles);
admin.use('/profile', misc.profile);
admin.use('/inquiries', misc.inquiries);
admin.use('/media', misc.media);
api.use('/admin', admin);

export default api;
