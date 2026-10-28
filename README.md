# Personal Portfolio Platform

A content-managed personal brand site: **design, full-stack web & mobile development, marketing & growth, and Web3 & community** work under one identity, with a secure single-owner CMS. Built from *Personal Portfolio PRD v1.0* and *MVP Roadmap v1.0*.

| Layer | Stack |
|---|---|
| Web (`apps/web`) | Next.js 14 App Router, React 18, JavaScript, Tailwind CSS + hand-written CSS tokens, Radix UI (lightbox/dialogs), self-hosted fonts (Newsreader, Instrument Sans) |
| API (`apps/api`) | Node.js + Express REST (`/api/v1`), Mongoose/MongoDB, Zod validation, JWT in httpOnly cookie + CSRF, Cloudinary, Resend |
| Tests | 18 API integration tests (`npm test`) |

Public pages: Home, About, Work (filter/search), 4 work templates (design gallery + lightbox, software case study, marketing campaign, Web3), Services, Articles (auto-hidden until an article is published), Contact, online Resume (+ PDF download), Privacy.
Admin (`/admin`): dashboard, work editor with draft → preview → publish → archive, categories, services, testimonials, experience, skills, profile/availability/resume/GitHub links, inquiries inbox, media library, Articles editor.

---

## 1. Quick start (local)

Requirements: **Node 20.9+** and **MongoDB** (local install, Docker, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
npm install                                   # installs both apps (npm workspaces)

# API config
cp apps/api/.env.example apps/api/.env        # then edit: MONGODB_URI, JWT_SECRET, OWNER_EMAIL …
# Web config
cp apps/web/.env.example apps/web/.env.local  # API_URL, NEXT_PUBLIC_SITE_URL, REVALIDATE_SECRET

npm run seed                                  # four pillars + clearly-marked SAMPLE content
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase' npm run admin:create

npm run dev                                   # API :4000 + web :3000
```

Open <http://localhost:3000> for the site and <http://localhost:3000/admin> to sign in.

> **Generate secrets:** `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — use one for `JWT_SECRET` and a different one for `REVALIDATE_SECRET` (the same value in both apps' env files).

Without Cloudinary credentials uploads are saved to `apps/api/uploads/` (fine for development). Without a Resend key inquiries are still stored and appear in the admin inbox.

### Replace the sample content
Everything the seed creates is flagged **sample** (the dashboard reminds you). In the CMS: edit **Profile and settings** (bio, availability, links, portrait, resume PDF), then replace or delete the sample work, **Experience** and **Skills**. The three software case studies in the seed are written only from facts you have shared (stack and features); they contain **no invented results, clients, or testimonials** — review and edit them. Testimonials start empty on purpose.

---

## 2. How the pieces fit

```
Browser ──► Next.js (apps/web) ──server components──► Express API (apps/api) ──► MongoDB
   │             │  /api/v1/* and /uploads/* are proxied to the API (rewrites)      └─► Cloudinary (media)
   └─ admin UI ──┘  → session cookie + CSRF stay first-party / same-origin          └─► Resend (email)
```

* **Proxy design.** The browser only ever talks to the web origin; Next rewrites `/api/v1/*` to the API. That keeps the session cookie first-party (`SameSite=Lax`), makes CSRF protection simple, and removes cross-origin cookie headaches. The API's CORS allow-list (`CLIENT_ORIGINS`) is still enforced.
* **Server-rendered & indexable.** Public pages fetch from the API on the server, so they are SSR/ISR, have per-page metadata, Open Graph tags, JSON-LD, `sitemap.xml` and `robots.txt`. If the API is down, pages degrade to friendly empty states instead of crashing.
* **Instant publishing.** After any CMS write, the API pings `POST {web}/api/revalidate` (shared secret) so changes — and *unpublishing* — appear immediately. If that ping fails, pages still refresh within 60 s.

### Content model (summary)
`Work` = one record, `type` ∈ design | development | marketing | web3, with shared fields (title, slug, summary, cover, gallery, tags, technologies, status, visibility, featured order, SEO) plus type-specific blocks. A work has a **primary pillar**, optional **additional pillars** and **subcategories** — one record, one canonical URL, listed in every area ticked. Lifecycle: **draft → (preview) → published → archived**. Renaming a published slug keeps the old URL working via redirect. Only drafts can be deleted; published work must be archived (keeps history).

---

## 3. Security & privacy measures (what is actually implemented)

* Single owner; **no public registration endpoint**. Admin created only via `npm run admin:create` (re-running with the same email resets the password and signs out all sessions).
* bcrypt (cost 12) password hashes; constant-time login path; **account lockout** (5 failures → 15 min) plus IP rate limit on login.
* Session = JWT in **httpOnly, SameSite** cookie (`Secure` in production); **CSRF** double-submit token bound to the session + `Origin` check on every mutation; “revoke all sessions” endpoint.
* Every `/api/v1/admin/*` route sits behind one middleware that validates the session *and* that the admin still exists/was not revoked. Tested: anonymous access to protected routes returns 401.
* **Zod validation on all writes** — unknown fields are stripped (no mass assignment); only `http(s)` URLs accepted (blocks `javascript:`).
* Drafts/archived items are never returned by public endpoints; previews use a **short-lived (30 min) signed token**.
* Uploads: type sniffed by **magic bytes** (not file extension), size limits, memory-buffered, Cloudinary credentials never reach the browser.
* Contact form: validation, consent checkbox, **honeypot**, time-trap, link-stuffing check, **5/hour/IP rate limit**; bots receive a silent success. IPs are stored only as a salted hash.
* Marketing metrics are **optional, never zero-filled, and hidden publicly unless “permission confirmed”**; each shows a *Verified* / *Owner-reported* label and source. Testimonials need explicit permission + approval before they appear.
* Helmet headers, CORS allow-list, request-size limits, error messages that do not leak internals.
* No third-party scripts by default (fonts are self-hosted). Analytics is opt-in (Plausible, cookieless) via `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
* Privacy notice page included. **It is a template — review it (retention period, your contact details) with your own legal needs in mind.**

---

## 4. Deployment

Recommended: **API on Render/Railway/Fly**, **web on Vercel or Render**, **MongoDB Atlas**, **Cloudinary**, **Resend**. Both apps deploy independently.

### API
| Setting | Value |
|---|---|
| Build / start | `npm install` / `npm run start:api` (root) — or in `apps/api`: `npm install` / `npm start` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | 48+ random bytes (the API refuses to boot in production without a strong one) |
| `CLIENT_ORIGINS` | your site origin(s), e.g. `https://yourname.com` |
| `PUBLIC_SITE_URL` | `https://yourname.com` |
| `TRUST_PROXY` | `true` (behind a platform load balancer) |
| `COOKIE_SECURE` | `true` |
| `CLOUDINARY_*` | cloud name / key / secret |
| `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL` | verify your sending domain in Resend first |
| `REVALIDATE_URL` | `https://yourname.com/api/revalidate` |
| `REVALIDATE_SECRET` | same value as the web app |
| `REDIS_URL` | optional `redis://` or `rediss://` connection URL for shared cache and distributed rate limits |

After first deploy run once (from a shell on the API service): `npm run seed` (optional) and `npm run admin:create`.

If the production database already contains the single owner account under an old email, set `ADMIN_REPLACE_EXISTING=true` for one `npm run admin:create` run. Remove `ADMIN_PASSWORD` and `ADMIN_REPLACE_EXISTING` immediately after the reset succeeds.

### Web
| Setting | Value |
|---|---|
| Root directory | `apps/web` (or repo root with build `npm run build`, start `npm run start:web`) |
| `API_URL` | the API's public URL (used server-side **and** by the `/api/v1` rewrite) |
| `NEXT_PUBLIC_SITE_URL` | `https://yourname.com` |
| `REVALIDATE_SECRET` | same value as the API |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional |

`API_URL` must be set **at build time and runtime** (the rewrite is compiled in).
Note: if you host the web app on Vercel and keep uploads on Cloudinary, nothing else is needed. Do **not** rely on local-disk uploads in production — container disks are ephemeral.

### Monorepo deployment filters

The root `netlify.toml` skips Netlify builds unless `apps/web`, the root package manifests, or the Netlify configuration changed. For the existing Render API service, configure **Settings → Build & Deploy → Build Filters → Included Paths** with:

```text
apps/api/**
package.json
```

Render build filters are relative to the repository root. Manual deploys and service-setting changes still deploy intentionally.

### Redis behaviour

Redis is optional. With `REDIS_URL` configured, public JSON responses use a shared Redis cache and the global, login, inquiry and upload limits gain a distributed Redis layer. The per-process LRU cache and rate limiters remain active as a fallback, so a Redis outage does not take the API offline. `/api/v1/health` reports the cache backend as `connected`, `connecting`, `disconnected`, or `not-configured`.

### Backups, restore, rollback (MVP-10)
* `npm run backup` writes JSON dumps of every collection to `apps/api/backups/<timestamp>/`. Restore with `npm run restore -- backups/<timestamp>` (replaces those collections). Schedule it (cron/GitHub Action) **and** enable Atlas continuous/snapshot backups. **Practise a restore into a scratch database before launch.**
* Media lives in Cloudinary — keep an export or enable its backup add-on.
* Rollback: redeploy the previous build on your host (both apps are stateless). The audit log (dashboard → recent activity) records admin actions.

### Launch checklist (PRD §9 go/no-go)
- [ ] Sample content replaced; at least one real item in each of the four areas
- [ ] Profile, portrait, availability, resume PDF, social links filled in
- [ ] Marketing numbers sourced; testimonials permissioned; skills honestly labelled (Active/Learning/Exploring)
- [ ] Alt text on all images (CMS prompts for it)
- [ ] Resend domain verified; send yourself a test inquiry end-to-end
- [ ] `COOKIE_SECURE=true`, strong `JWT_SECRET`, HTTPS everywhere
- [ ] Backup + **restore** rehearsed; Atlas IP/network access locked down
- [ ] `npm test` passes
- [ ] Privacy notice reviewed

---

## 5. Testing

```bash
npm test                    # 18 API integration tests (needs MongoDB; uses db "portfolio_test", dropped at the end)
                            # TEST_MONGODB_URI=mongodb://… to point elsewhere

```

What was verified during development: API suite 18/18 passing against a real MongoDB-protocol database; keyboard operation of the lightbox (open, arrows, Esc, focus restore); mobile menu; no horizontal overflow at 390 px; unpublish takes effect in under a second.
**Not verifiable in the build sandbox (no outside network/credentials):** live Cloudinary uploads, live Resend delivery, live GitHub metadata fetch (the fallback to your own text is the path that was exercised). Test those three on staging with your real keys.

---

## 6. PRD / MVP traceability

| Requirement | Status |
|---|---|
| WRK-01…07 work CRUD, subcategories, filters, gallery+lightbox, software & campaign case studies, featured ordering | ✅ |
| WRK-08 Web3 network / explorer / contract-verification fields | ✅ |
| WRK-09 rich media / video embeds with allow-list | ⏳ not included — images + Markdown links only (Should) |
| WRK-10, CMS-09 wallet demos, revision history, scheduled publish, multi-role | ⏳ Later (per PRD) |
| CMS-01…07 login, overview (real counts only), CRUD, media library, draft/preview/publish/archive, availability/socials/resume, inquiries | ✅ |
| CMS-08 articles with rich-text editor + SEO | ◐ Markdown editor + SEO fields (no WYSIWYG) |
| PUB-01…09 responsive light/dark, theme persistence, resume online + PDF, services→inquiry preselect, contact, testimonials, availability, GitHub links, Web3 showcase | ✅ |
| PUB-10 search / sort / related work | ✅ |
| §8 NFRs: performance (lazy images, ISR), WCAG 2.2 AA target, security, SEO (sitemap, OG, canonical, JSON-LD), privacy notice, reliability states | ✅ (see checklist above for items that need your content/keys) |
| MVP-01…10 stories | ✅ |

### Design notes
Editorial light theme is the default; the technical dark theme is a toggle (stored locally, set before first paint — no flash). Each pillar owns a colour (magenta, cobalt, amber, teal) used as identity on cards, filters and services, never as the only signal. Motion: one page-load headline reveal, plus responses to user actions; `prefers-reduced-motion` is respected. Styles live in `apps/web/src/styles/` (`tokens.css`, `base.css`, `site.css`, `admin.css`), separate from the JSX.

### Repository layout
```
apps/api/src   config/ lib/ middleware/ models/ routes/(public + admin) schemas/ scripts/(seed, createAdmin, backup, restore)
apps/api/tests API integration tests
apps/web/src   app/(site)/… public pages · app/admin/… CMS · components/ · lib/ · styles/
```
