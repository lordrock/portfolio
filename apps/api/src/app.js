import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { globalLimiter, globalSharedLimiter } from './middleware/rateLimits.js';
import { publicResponseCache } from './middleware/responseCache.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { uploadRoot } from './lib/storage.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin / server-to-server requests have no Origin header.
        if (!origin || env.clientOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    })
  );
  app.use(globalLimiter);
  app.use(globalSharedLimiter);
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  // Serve repeated public reads from memory before checking MongoDB. Admin,
  // preview, inquiry and resume-download requests are deliberately excluded.
  app.use(publicResponseCache);

  // Keep the HTTP server available while MongoDB reconnects. This produces a
  // useful 503 response instead of resetting proxied requests from Next.js.
  app.use((req, res, next) => {
    if (req.path === '/api/v1/health') return next();
    if (mongoose.connection.readyState !== 1) {
      res.set('Retry-After', '5');
      return res.status(503).json({ error: 'Database temporarily unavailable. Please retry shortly.' });
    }
    return next();
  });

  // Local-disk media (development / single-server). Cloudinary URLs bypass this.
  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', index: false, dotfiles: 'deny', setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));

  app.use('/api/v1', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
