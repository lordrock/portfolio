import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    alt: { type: String, default: '' },
    caption: { type: String, default: '' },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const seoSchema = new Schema(
  { title: String, description: String, ogImage: String },
  { _id: false }
);

const linkSchema = new Schema({ label: { type: String, required: true }, url: { type: String, required: true } }, { _id: false });

/* ------------------------------------------------------------------ Admin */
const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: 'Owner' },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    failedAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

/* --------------------------------------------------------------- Category */
// kind "pillar" = the four top-level areas; "sub" = owner-managed subcategory under a pillar.
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    kind: { type: String, enum: ['pillar', 'sub'], default: 'sub' },
    parent: { type: ObjectId, ref: 'Category', default: null },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ------------------------------------------------------------------- Work */
const metricSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true }, // string so "12.4k" or "3.2%" keep their context; never defaulted to 0
    unit: { type: String, default: '' },
    context: { type: String, default: '' },
    source: { type: String, default: '' },
    sourceType: { type: String, enum: ['verified', 'owner-reported'], default: 'owner-reported' },
  },
  { _id: false }
);

const workSchema = new Schema(
  {
    type: { type: String, enum: ['design', 'development', 'marketing', 'web3'], required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    previousSlugs: { type: [String], default: [], index: true },
    summary: { type: String, default: '' },
    body: { type: String, default: '' }, // markdown
    cover: imageSchema,
    gallery: { type: [imageSchema], default: [] },

    primaryCategory: { type: ObjectId, ref: 'Category', required: true },
    categories: [{ type: ObjectId, ref: 'Category' }], // additional pillars
    subcategories: [{ type: ObjectId, ref: 'Category' }],
    tags: { type: [String], default: [] },
    technologies: { type: [String], default: [] },

    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
    projectStatus: {
      type: String,
      enum: ['none', 'live', 'in-development', 'completed', 'archived'],
      default: 'none',
    },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    publishedAt: Date,
    dateLabel: { type: String, default: '' }, // e.g. "2025" or "Mar – Jun 2025"
    seo: seoSchema,
    isSample: { type: Boolean, default: false },

    design: {
      assetType: { type: String, default: '' }, // flyer, poster, logo, social…
      client: { type: String, default: '' },
      brief: { type: String, default: '' },
      process: { type: String, default: '' },
    },
    development: {
      role: { type: String, default: '' },
      stack: { type: [String], default: [] },
      features: { type: [String], default: [] },
      challenge: { type: String, default: '' },
      solution: { type: String, default: '' },
      architecture: { type: String, default: '' },
      outcomes: { type: String, default: '' },
      repoUrl: { type: String, default: '' },
      liveUrl: { type: String, default: '' },
    },
    marketing: {
      brand: { type: String, default: '' },
      role: { type: String, default: '' },
      objective: { type: String, default: '' },
      platforms: { type: [String], default: [] },
      duration: { type: String, default: '' },
      outcome: { type: String, default: '' },
      evidenceLinks: { type: [linkSchema], default: [] },
      metrics: { type: [metricSchema], default: [] },
      permissionConfirmed: { type: Boolean, default: false },
    },
    web3: {
      kind: { type: String, enum: ['community', 'experiment', 'production'], default: 'community' },
      program: { type: String, default: '' },
      network: { type: String, default: '' },
      role: { type: String, default: '' },
      explorerUrl: { type: String, default: '' },
      repoUrl: { type: String, default: '' },
      contractAddress: { type: String, default: '' },
      contractVerified: { type: Boolean, default: false },
      disclaimer: { type: String, default: '' },
      evidenceLinks: { type: [linkSchema], default: [] },
    },
  },
  { timestamps: true }
);
workSchema.index({ title: 'text', summary: 'text', tags: 'text', technologies: 'text' });
workSchema.index({ status: 1, visibility: 1, primaryCategory: 1 });

/* --------------------------------------------------------------- Services */
const serviceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    pillar: { type: ObjectId, ref: 'Category', required: true },
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    deliverables: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ------------------------------------------------------------ Testimonials */
const testimonialSchema = new Schema(
  {
    quote: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: '' },
    company: { type: String, default: '' },
    avatar: imageSchema,
    work: { type: ObjectId, ref: 'Work' },
    approved: { type: Boolean, default: false },
    permissionConfirmed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ------------------------------------------------------ Experience, skills */
const experienceSchema = new Schema(
  {
    role: { type: String, required: true },
    organization: { type: String, required: true },
    location: { type: String, default: '' },
    startLabel: { type: String, default: '' },
    endLabel: { type: String, default: '' }, // blank + current=true → "Present"
    current: { type: Boolean, default: false },
    summary: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const skillSchema = new Schema(
  {
    name: { type: String, required: true },
    group: { type: String, default: 'General' },
    state: { type: String, enum: ['active', 'learning', 'exploring'], default: 'active' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ----------------------------------------------------------- Site profile */
const profileSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true },
    name: { type: String, default: 'Your Name' },
    headline: { type: String, default: 'I design, build, and grow digital experiences.' },
    role: { type: String, default: '' },
    shortBio: { type: String, default: '' },
    bio: { type: String, default: '' }, // markdown
    photo: imageSchema,
    location: { type: String, default: '' },
    email: { type: String, default: '' },
    availability: {
      status: { type: String, enum: ['available', 'limited', 'unavailable'], default: 'available' },
      text: { type: String, default: 'Open to new projects' },
      note: { type: String, default: '' },
    },
    resume: {
      url: String,
      publicId: String,
      filename: String,
      updatedAt: Date,
      downloads: { type: Number, default: 0 },
    },
    approach: { type: [new Schema({ title: String, text: String }, { _id: false })], default: [] },
    seo: seoSchema,
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------- Articles */
const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    excerpt: { type: String, default: '' },
    body: { type: String, default: '' },
    cover: imageSchema,
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: Date,
    seo: seoSchema,
  },
  { timestamps: true }
);

/* ---------------------------------------------------------------- Inquiries */
const inquirySchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    topic: { type: String, default: '' },
    message: { type: String, required: true },
    consent: { type: Boolean, default: false },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new' },
    notified: { type: Boolean, default: false },
    ipHash: String,
    userAgent: String,
  },
  { timestamps: true }
);
inquirySchema.index({ createdAt: -1 });

/* ------------------------------------------------------------------- Media */
const mediaSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    resourceType: { type: String, default: 'image' },
    filename: String,
    mime: String,
    size: Number,
    width: Number,
    height: Number,
    alt: { type: String, default: '' },
  },
  { timestamps: true }
);

/* --------------------------------------------------------------- Audit log */
const auditSchema = new Schema(
  {
    action: String,
    entity: String,
    entityId: String,
    summary: String,
    ip: String,
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

const m = (name, schema) => mongoose.models[name] || model(name, schema);

export const Admin = m('Admin', adminSchema);
export const Category = m('Category', categorySchema);
export const Work = m('Work', workSchema);
export const Service = m('Service', serviceSchema);
export const Testimonial = m('Testimonial', testimonialSchema);
export const Experience = m('Experience', experienceSchema);
export const Skill = m('Skill', skillSchema);
export const Profile = m('Profile', profileSchema);
export const Article = m('Article', articleSchema);
export const Inquiry = m('Inquiry', inquirySchema);
export const Media = m('Media', mediaSchema);
export const AuditLog = m('AuditLog', auditSchema);
