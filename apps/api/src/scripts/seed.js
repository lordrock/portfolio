// Seeds the four pillars, starter structure and clearly-marked SAMPLE content so the site looks complete on first run.
// Everything flagged isSample can be edited or deleted in the CMS. No metrics, testimonials or client results are invented.
// Usage: npm run seed            (skips if content exists)
//        npm run seed -- --reset (wipes content collections first; never touches the admin account)
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Article, Category, Experience, Profile, Service, Skill, Testimonial, Work } from '../models/index.js';

const reset = process.argv.includes('--reset');
await mongoose.connect(env.MONGODB_URI);

if (reset) {
  await Promise.all([Work, Category, Service, Testimonial, Experience, Skill, Profile, Article].map((m) => m.deleteMany({})));
  console.log('Content collections cleared.');
} else if (await Category.countDocuments()) {
  console.log('Content already exists — nothing seeded. Use `npm run seed -- --reset` to start over.');
  await mongoose.disconnect();
  process.exit(0);
}

/* ------------------------------------------------------------- Pillars */
const pillarDefs = [
  ['Design & Branding', 'design', 'Identity, flyers, posters and visual systems.'],
  ['Full-Stack Web & Mobile Development', 'development', 'Full-stack web and mobile applications, APIs and dashboards.'],
  ['Marketing & Growth', 'marketing', 'Campaigns, content and community-led growth.'],
  ['Web3 & Community', 'web3', 'Ambassador programs, community building and on-chain experiments.'],
];
const P = {};
for (const [i, [name, slug, description]] of pillarDefs.entries()) {
  P[slug] = await Category.create({ name, slug, kind: 'pillar', description, order: i });
}
const subDefs = [
  ['design', 'Flyers & Posters', 'flyers-posters'],
  ['design', 'Brand Identity', 'brand-identity'],
  ['development', 'Web & Mobile Applications', 'full-stack-apps'],
  ['development', 'Frontend & UI', 'frontend-ui'],
  ['marketing', 'Campaigns', 'campaigns'],
  ['marketing', 'Ambassador Work', 'ambassador-work'],
  ['web3', 'Community', 'community'],
  ['web3', 'Experiments', 'experiments'],
];
const S = {};
for (const [i, [pillar, name, slug]] of subDefs.entries()) {
  S[slug] = await Category.create({ name, slug, kind: 'sub', parent: P[pillar]._id, order: i });
}

/* ------------------------------------------------------------- Profile */
await Profile.create({
  key: 'site',
  name: 'Oyewumi',
  headline: 'I design, build, and grow digital experiences.',
  role: 'Full-Stack Web & Mobile Developer · Designer · Growth & community',
  shortBio:
    'Full-stack web and mobile developer who ships complete, production-minded products — from API and database to polished interface — with a designer’s eye and a marketer’s sense of who it’s for.',
  bio: `I build complete web and mobile products end to end: the **API**, the **database**, the **admin tools** and the **interface** people actually touch.\n\nMy day-to-day stack is Node.js with Express or NestJS, MongoDB (and PostgreSQL when the data calls for it), and Next.js, React or React Native on the front. I care about the unglamorous parts that make software trustworthy — validation, authentication, safe payments flows and clear error states.\n\nBeyond code, I design visuals and brand assets and have worked in marketing and Web3 community spaces, which shapes how I think about products: who is this for, how will they find it, and why will they stay?\n\n> *Sample copy — replace this biography from the CMS (Profile → Biography).*`,
  location: '',
  email: process.env.OWNER_EMAIL || '',
  availability: { status: 'available', text: 'Open to new projects', note: '' },
  approach: [
    { title: 'Understand first', text: 'I start with who the product is for and what success looks like, then work backwards to the smallest thing worth building.' },
    { title: 'Build it properly', text: 'Typed contracts, validated inputs, secure sessions and honest error states — the details clients never see but always feel.' },
    { title: 'Ship, measure, refine', text: 'Releases that can be operated and rolled back, with feedback loops that tell us what to improve next.' },
  ],
});

/* ------------------------------------------------------------ Services */
const services = [
  ['Brand & visual design', 'design', 'Logos, flyers, posters and social assets that look consistent and considered.', ['Logo & identity basics', 'Flyers, posters & event graphics', 'Social media asset kits', 'Brand guideline one-pager']],
  ['Full-Stack Web & Mobile Development', 'development', 'Production-ready web and mobile apps, APIs and admin dashboards, delivered complete.', ['Full-stack web and mobile applications', 'REST API design & implementation', 'Admin dashboards & CMS', 'Payments, auth & integrations']],
  ['Marketing & growth', 'marketing', 'Campaign planning, content direction and growth support for digital products.', ['Campaign strategy & creative direction', 'Content & social planning', 'Landing page copy & structure', 'Launch support']],
  ['Web3 & community', 'web3', 'Community building and ambassador-style programs for Web3 projects.', ['Community onboarding & moderation playbooks', 'Ambassador program support', 'Documentation & educational content', 'Frontend work for dApps (non-custodial)']],
];
for (const [i, [title, pillar, summary, deliverables]] of services.entries()) {
  await Service.create({ title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), pillar: P[pillar]._id, summary, description: summary, deliverables, order: i });
}

/* ------------------------------------------------------------ Skills */
const skillDefs = [
  ['Frontend', ['Next.js', 'React', 'JavaScript', 'TypeScript', 'Tailwind CSS'], 'active'],
  ['Backend', ['Node.js', 'Express', 'NestJS', 'REST API design', 'JWT authentication'], 'active'],
  ['Data & Infra', ['MongoDB', 'PostgreSQL', 'Cloudinary', 'Render deployment'], 'active'],
  ['Design', ['UI design', 'Brand & flyer design'], 'active'],
  ['Web3', ['Solidity', 'viem / wagmi', 'On-chain demos'], 'exploring'],
];
let so = 0;
for (const [group, names, state] of skillDefs) for (const name of names) await Skill.create({ name, group, state, order: so++ });

/* ---------------------------------------------------------- Experience */
await Experience.create({
  role: 'Full-Stack Web & Mobile Developer',
  organization: 'Independent',
  location: 'Remote',
  startLabel: '',
  current: true,
  summary: 'Designing and building complete web and mobile products from product requirement documents — APIs, databases, admin consoles and customer-facing interfaces.',
  highlights: ['Delivers full systems, not scaffolds: models, routes, services and UI pages', 'Works across Next.js, React, Node.js, Express/NestJS and MongoDB', 'Sample entry — edit dates and details in the CMS'],
  order: 0,
  isSample: true,
});

/* --------------------------------------------------------------- Works */
const cover = (name, alt) => ({ url: `/samples/${name}.svg`, alt });
const g = (names, alt) => names.map((n, i) => ({ url: `/samples/${n}.svg`, alt: `${alt} ${i + 1}`, caption: '' }));
const now = Date.now();
const d = (days) => new Date(now - days * 86400000);

const works = [
  {
    type: 'development', title: 'NaijaPay — utility & VTU payments platform', slug: 'naijapay',
    summary: 'A full Nigerian bill-payment platform: wallet funding, airtime, data and utility purchases with resilient provider fallback.',
    body: `NaijaPay lets users fund a wallet and buy airtime, data and utilities from one place.\n\nThe interesting engineering is in the money paths: wallet debits and credits are **atomic**, payment webhooks are **HMAC-verified**, and purchases go through a **provider adapter with automatic fallback** so one upstream outage doesn't take the product down.`,
    cover: cover('dev-1', 'Abstract dashboard composition'), gallery: g(['dev-1', 'dev-2'], 'NaijaPay screen'),
    primaryCategory: P.development._id, subcategories: [S['full-stack-apps']._id], technologies: ['Next.js 14', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS', 'Zustand', 'Paystack', 'VTPass'], tags: ['fintech', 'payments'],
    projectStatus: 'completed', featured: true, featuredOrder: 1, publishedAt: d(10), dateLabel: '2026',
    development: {
      role: 'Full-stack developer (solo)', stack: ['Next.js 14', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS', 'Zustand'],
      features: ['Wallet with atomic debit/credit transactions', 'Paystack funding with HMAC webhook verification', 'VTPass adapter with automatic fallback provider', 'Eight-model MongoDB data layer', 'Monorepo with web and API apps'],
      challenge: 'Money movement must never double-spend or lose a transaction when a webhook retries or an upstream provider fails mid-purchase.',
      solution: 'Wallet changes run in atomic operations keyed by transaction reference; webhooks are signature-verified and idempotent; the provider layer is an adapter with fallback.',
      architecture: 'Monorepo: Next.js 14 front end and a separate Express API over MongoDB.',
      outcomes: 'Delivered as a complete codebase with documentation. (No usage statistics are claimed.)',
      repoUrl: '', liveUrl: '',
    },
  },
  {
    type: 'development', title: 'Sacred Roots — practitioner platform with admin dashboard', slug: 'sacred-roots',
    summary: 'A React site with an admin dashboard and Express/MongoDB backend for a spiritual practitioner, with Cloudinary image management.',
    body: `A content-managed site for a practitioner: public pages driven by live data, plus an admin dashboard for managing content and images.\n\nWork included wiring components to live data, Multer → Cloudinary uploads, and deployment preparation (environment variables, CORS, Render hosting).`,
    cover: cover('dev-2', 'Abstract layered interface'), gallery: g(['dev-2', 'dev-1'], 'Sacred Roots screen'),
    primaryCategory: P.development._id, subcategories: [S['full-stack-apps']._id], technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Cloudinary', 'Multer'], tags: ['cms', 'admin'],
    projectStatus: 'completed', featured: true, featuredOrder: 2, publishedAt: d(30), dateLabel: '2026',
    development: {
      role: 'Full-stack developer', stack: ['React', 'Express', 'MongoDB', 'Cloudinary'],
      features: ['Admin dashboard for content management', 'Image uploads via Multer and Cloudinary', 'Live-data components', 'Render deployment configuration'],
      challenge: 'Replace static content with live data safely and make image management simple for a non-technical owner.',
      solution: 'A REST API with an admin dashboard and Cloudinary-backed uploads, prepared for hosted deployment.',
      architecture: '', outcomes: '', repoUrl: '', liveUrl: '',
    },
  },
  {
    type: 'development', title: 'Card Balance — gift card concierge interface', slug: 'card-balance',
    summary: 'A pure HTML/CSS/JavaScript luxury gift-card concierge app with a custom brand-logo dropdown and SVG navigation marks.',
    body: 'A front-end-only build focused on polish: a fully custom dropdown (native `<select>` can’t render logos), carefully built SVG nav logos and a refined, premium visual language.',
    cover: cover('dev-1', 'Abstract card layout'), gallery: [],
    primaryCategory: P.development._id, subcategories: [S['frontend-ui']._id], technologies: ['HTML', 'CSS', 'JavaScript', 'SVG'], tags: ['frontend', 'ui'],
    projectStatus: 'completed', publishedAt: d(60), dateLabel: '2026',
    development: { role: 'Designer & developer', stack: ['HTML', 'CSS', 'JavaScript', 'SVG'], features: ['Custom dropdown with brand logos', 'Hand-built SVG logos'], challenge: '', solution: '', architecture: '', outcomes: '', repoUrl: '', liveUrl: '' },
  },
  {
    type: 'design', title: 'Event flyer series', slug: 'event-flyer-series',
    summary: 'A consistent set of event flyers exploring bold type and a restrained palette. (Sample — replace with your own work.)',
    body: '', cover: cover('design-1', 'Poster composition with bold geometric shapes'), gallery: g(['design-1', 'design-2', 'design-3', 'design-4', 'design-5', 'design-6'], 'Flyer'),
    primaryCategory: P.design._id, subcategories: [S['flyers-posters']._id], tags: ['flyer', 'poster', 'typography'], technologies: [],
    featured: true, featuredOrder: 3, publishedAt: d(15), dateLabel: '2026',
    design: { assetType: 'Flyer', client: '', brief: 'Create a flexible flyer system for recurring events.', process: '' },
  },
  {
    type: 'design', title: 'Brand identity concept', slug: 'brand-identity-concept',
    summary: 'A personal concept exploring a wordmark, colour system and applications. (Sample — replace with your own work.)',
    body: '', cover: cover('design-3', 'Brand mark exploration'), gallery: g(['design-3', 'design-2', 'design-6'], 'Identity'),
    primaryCategory: P.design._id, subcategories: [S['brand-identity']._id], tags: ['logo', 'identity'], technologies: [],
    publishedAt: d(40), dateLabel: '2026',
    design: { assetType: 'Logo', client: 'Personal concept', brief: 'An unbriefed exploration of a modern wordmark.', process: '' },
  },
  {
    type: 'marketing', title: 'Community launch campaign', slug: 'community-launch-campaign',
    summary: 'A narrative campaign case study template — objective, channels and creative. (Sample — replace with a real, permissioned campaign.)',
    body: 'This is placeholder structure showing how a campaign case study reads. Replace it with a real campaign. Metrics appear only when you add them with a source.',
    cover: cover('marketing-1', 'Abstract campaign composition'), gallery: g(['marketing-1', 'design-5'], 'Creative'),
    primaryCategory: P.marketing._id, subcategories: [S.campaigns._id], tags: ['campaign', 'social'], technologies: [],
    publishedAt: d(20), dateLabel: '2026',
    marketing: { brand: 'Sample brand', role: 'Campaign strategist', objective: 'Build awareness and an initial community for a product launch.', platforms: ['X / Twitter', 'Discord', 'Telegram'], duration: '6 weeks', outcome: 'Narrative outcome goes here. No numbers are shown unless you add sourced metrics.', evidenceLinks: [], metrics: [], permissionConfirmed: true },
  },
  {
    type: 'web3', title: 'Ambassador program contribution', slug: 'ambassador-program-contribution',
    summary: 'A placeholder Web3 community entry — role, program and links to evidence. (Sample — replace with real contributions.)',
    body: 'Use this entry type for ambassador work, community programs and experiments. Explorer links and contract verification details are optional and only shown when provided.',
    cover: cover('web3-1', 'Abstract network composition'), gallery: [],
    primaryCategory: P.web3._id, categories: [P.marketing._id], subcategories: [S.community._id, S['ambassador-work']._id], tags: ['ambassador', 'community'], technologies: [],
    publishedAt: d(25), dateLabel: '2026',
    web3: { kind: 'community', program: 'Sample program', network: '', role: 'Community ambassador', explorerUrl: '', repoUrl: '', contractAddress: '', contractVerified: false, disclaimer: 'Community activity — not a production smart-contract deployment.', evidenceLinks: [] },
  },
];
for (const w of works) await Work.create({ ...w, status: 'published', visibility: 'public', isSample: true, seo: { title: '', description: '' } });

console.log(`Seeded: 4 pillars, ${subDefs.length} subcategories, ${services.length} services, ${works.length} sample works.`);
console.log('Testimonials are intentionally empty — add real, permissioned ones in the CMS.');
await mongoose.disconnect();
