import { z } from 'zod';

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const str = (max = 200) => z.string().trim().max(max);
const text = (max = 20000) => z.string().max(max);
const strList = (maxItems = 40, maxLen = 80) => z.array(str(maxLen).min(1)).max(maxItems);

// Only http(s) links, or our own public asset paths. Blocks javascript:, data: etc.
const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || /^\/(uploads|samples|work-covers)\//.test(v), 'Must be an http(s) URL or a supported site asset path');
const optionalUrl = safeUrl.optional().default('');

const image = z.object({
  url: safeUrl.refine((v) => v !== '', 'Image URL required'),
  publicId: str(300).optional(),
  alt: str(300).optional().default(''),
  caption: str(400).optional().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
const link = z.object({ label: str(80).min(1), url: safeUrl.refine((v) => v !== '') });
const seo = z
  .object({ title: str(120).optional(), description: str(300).optional(), ogImage: safeUrl.optional() })
  .optional();

export const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export const categorySchema = z.object({
  name: str(80).min(1),
  slug: str(80).optional(),
  kind: z.enum(['pillar', 'sub']).default('sub'),
  parent: mongoId.nullable().optional(),
  description: str(400).optional().default(''),
  order: z.number().int().optional().default(0),
});

const metric = z.object({
  label: str(80).min(1),
  value: str(40).min(1),
  unit: str(40).optional().default(''),
  context: str(300).optional().default(''),
  source: str(400).optional().default(''),
  sourceType: z.enum(['verified', 'owner-reported']).default('owner-reported'),
});

export const workSchema = z.object({
  type: z.enum(['design', 'development', 'marketing', 'web3']),
  title: str(140).min(1),
  slug: str(100).optional(),
  summary: str(500).optional().default(''),
  body: text().optional().default(''),
  cover: image.nullable().optional(),
  gallery: z.array(image).max(60).optional().default([]),
  primaryCategory: mongoId,
  categories: z.array(mongoId).max(8).optional().default([]),
  subcategories: z.array(mongoId).max(20).optional().default([]),
  tags: strList().optional().default([]),
  technologies: strList().optional().default([]),
  visibility: z.enum(['public', 'unlisted']).default('public'),
  projectStatus: z.enum(['none', 'live', 'in-development', 'completed', 'archived']).default('none'),
  featured: z.boolean().optional().default(false),
  featuredOrder: z.number().int().optional().default(0),
  order: z.number().int().optional().default(0),
  dateLabel: str(60).optional().default(''),
  seo,
  design: z
    .object({
      assetType: str(60).optional().default(''),
      client: str(120).optional().default(''),
      brief: text(4000).optional().default(''),
      process: text(6000).optional().default(''),
    })
    .optional(),
  development: z
    .object({
      role: str(120).optional().default(''),
      stack: strList().optional().default([]),
      features: strList(30, 200).optional().default([]),
      challenge: text(4000).optional().default(''),
      solution: text(4000).optional().default(''),
      architecture: text(4000).optional().default(''),
      outcomes: text(4000).optional().default(''),
      repoUrl: optionalUrl,
      liveUrl: optionalUrl,
    })
    .optional(),
  marketing: z
    .object({
      brand: str(120).optional().default(''),
      role: str(120).optional().default(''),
      objective: text(2000).optional().default(''),
      platforms: strList().optional().default([]),
      duration: str(80).optional().default(''),
      outcome: text(4000).optional().default(''),
      evidenceLinks: z.array(link).max(20).optional().default([]),
      metrics: z.array(metric).max(20).optional().default([]),
      permissionConfirmed: z.boolean().optional().default(false),
    })
    .optional(),
  web3: z
    .object({
      kind: z.enum(['community', 'experiment', 'production']).default('community'),
      program: str(160).optional().default(''),
      network: str(80).optional().default(''),
      role: str(120).optional().default(''),
      explorerUrl: optionalUrl,
      repoUrl: optionalUrl,
      contractAddress: str(100).optional().default(''),
      contractVerified: z.boolean().optional().default(false),
      disclaimer: text(1000).optional().default(''),
      evidenceLinks: z.array(link).max(20).optional().default([]),
    })
    .optional(),
});

export const serviceSchema = z.object({
  title: str(120).min(1),
  slug: str(100).optional(),
  pillar: mongoId,
  summary: str(400).optional().default(''),
  description: text(6000).optional().default(''),
  deliverables: strList(20, 160).optional().default([]),
  order: z.number().int().optional().default(0),
  published: z.boolean().optional().default(true),
});

export const testimonialSchema = z.object({
  quote: text(1500).min(1),
  authorName: str(100).min(1),
  authorRole: str(120).optional().default(''),
  company: str(120).optional().default(''),
  avatar: image.nullable().optional(),
  work: mongoId.nullable().optional(),
  approved: z.boolean().optional().default(false),
  permissionConfirmed: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
});

export const experienceSchema = z.object({
  role: str(120).min(1),
  organization: str(120).min(1),
  location: str(120).optional().default(''),
  startLabel: str(40).optional().default(''),
  endLabel: str(40).optional().default(''),
  current: z.boolean().optional().default(false),
  summary: text(2000).optional().default(''),
  highlights: strList(12, 240).optional().default([]),
  order: z.number().int().optional().default(0),
  visible: z.boolean().optional().default(true),
});

export const skillSchema = z.object({
  name: str(60).min(1),
  group: str(60).optional().default('General'),
  state: z.enum(['active', 'learning', 'exploring']).default('active'),
  order: z.number().int().optional().default(0),
});

export const articleSchema = z.object({
  title: str(160).min(1),
  slug: str(100).optional(),
  excerpt: str(400).optional().default(''),
  body: text(60000).optional().default(''),
  cover: image.nullable().optional(),
  tags: strList(12).optional().default([]),
  seo,
});

export const profileSchema = z.object({
  name: str(100).min(1),
  headline: str(200).optional().default(''),
  role: str(120).optional().default(''),
  shortBio: str(600).optional().default(''),
  bio: text(10000).optional().default(''),
  photo: image.nullable().optional(),
  location: str(120).optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  availability: z
    .object({
      status: z.enum(['available', 'limited', 'unavailable']).default('available'),
      text: str(120).optional().default(''),
      note: str(400).optional().default(''),
    })
    .optional(),
  approach: z.array(z.object({ title: str(100), text: str(500) })).max(8).optional().default([]),
  seo,
});

export const resumeSchema = z.object({
  url: safeUrl.refine((v) => v !== ''),
  publicId: str(300).optional(),
  filename: str(200).optional(),
});

export const inquirySchema = z.object({
  name: str(100).min(2, 'Please enter your name'),
  email: z.string().trim().email('Please enter a valid email').max(200),
  topic: str(120).optional().default(''),
  message: z.string().trim().min(10, 'Please write a little more (10+ characters)').max(4000),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required so I can reply to you' }) }),
  website: z.string().max(200).optional().default(''), // honeypot
  startedAt: z.number().optional(), // time trap
});

export const inquiryUpdateSchema = z.object({ status: z.enum(['new', 'read', 'archived']) });
export const reorderSchema = z.object({ items: z.array(z.object({ id: mongoId, order: z.number().int() })).max(500) });
export const mediaUpdateSchema = z.object({ alt: str(300).optional().default('') });
