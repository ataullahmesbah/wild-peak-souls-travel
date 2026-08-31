# Wild Peak Souls

A premium travel platform and agency management system: a customer-facing
travel website plus an internal dashboard for running the business — travel
products, events, bookings, visa assistance, accommodation, payments, support,
finance and site content — without editing source code for normal operations.

Built to the Wild Peak Souls PRD, v1.0 and v2.0.

See `docs/V2_CHANGES.md` for what v2 added and what it fixed.

---

## Table of contents

- [What is included](#what-is-included)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Seed data and demo accounts](#seed-data-and-demo-accounts)
- [Project structure](#project-structure)
- [How the important parts work](#how-the-important-parts-work)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Verification](#verification)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)

---

## What is included

### Public website

| Area | Routes |
| --- | --- |
| Home | `/` — hero, travel search, featured destinations, upcoming events, trending activities, tours, stays, service triptych, custom-tour CTA, why-us, live counters, reviews, guides, ad slot |
| Destinations | `/destinations`, `/destinations/[slug]` — each destination page surfaces the live events, tours, activities and stays attached to it |
| Events | `/events`, `/events/[slug]` — fixed departures with live seat counts, itinerary, add-ons, policies |
| Tours | `/tours`, `/tours/[slug]` — day-by-day itinerary, inclusions/exclusions |
| Activities | `/activities`, `/activities/[slug]` |
| Stays | `/stays`, `/stays/[slug]` — properties, room types, per-night availability |
| Visa | `/visa`, `/visa/[country]/[type]` — separate checklists for general, business-owner, student and other applicants, with a request form |
| Flights | `/flights` — indicative route explorer and booking **inquiry** (no ticketing) |
| Trains | `/train-schedule` — informational Bangladesh Railway timings (no ticketing) |
| Custom tour | `/custom-tour` |
| Content | `/services`, `/about`, `/contact`, `/guides`, `/guides/[slug]`, `/faq`, `/policies/[slug]` |
| Checkout | `/checkout/[bookingId]` |
| Auth | `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` |
| System | `/maintenance`, `sitemap.xml`, `robots.txt` |

### Customer account (`/account`)

Overview, bookings (with filters and detail), payments, invoices (printable
HTML → PDF), requests (visa / custom tour / flight / contact), support tokens
with threaded conversation, messages, notifications, wishlist, reviews, profile
and security.

### Admin dashboard (`/admin`)

Permission-driven sidebar, dashboard metrics, destinations, events (with live
fill rates), tours, activities, stays, bookings, payment verification queue,
visa requests, leads, train schedule, users & roles, support, review
moderation, notices, advertisements, finance, reports, media library, audit log
and settings.

---

## Tech stack

- **Next.js 16** (App Router, Server Components by default)
- **React 19**
- **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS 4** (CSS-first config, semantic design tokens)
- **PostgreSQL 16** + **Prisma 6**
- **Zod 4** for all input validation
- **jose** (JWT session cookies) + **bcryptjs** (password hashing)
- **Cloudinary** for media (signed uploads)
- **lucide-react** for icons

---

## Quick start

> **Already running v1 with real data?** Do not run `npm run db:seed` — it is
> for a fresh install. Follow `docs/UPGRADING.md` instead, which uses
> `npm run db:upgrade`: additive only, and it prints your row counts before and
> after so you can see nothing moved.


```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    then edit .env — at minimum set DATABASE_URL and AUTH_SECRET
#    generate a secret with:  openssl rand -base64 48

# 3. Create the schema
npm run db:migrate      # development (creates a migration)
# or
npm run db:deploy       # production (applies existing migrations)

# 4. Load roles, permissions, settings and demo content
npm run db:seed

# 5. Run
npm run dev             # http://localhost:3000
```

Then sign in at `/login` with the credentials printed by the seed script.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Session JWT signing key, **32+ characters** |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical URLs, sitemap, OG tags |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google OAuth (the dashboard toggle only shows the button when both are set) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | no | Media uploads (server-side only) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | no | Client-side Cloudinary URL building |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | no | Bootstrap account for `db:seed` |

`AUTH_SECRET` and the Cloudinary API secret are read **only** on the server and
never reach the browser bundle. This is verified by the test suite.

---

## Database

The schema lives in `prisma/schema.prisma` and covers 40+ models across
identity/RBAC, travel catalogue, visa, bookings, payments, invoices, leads,
support, messaging, notifications, reviews, marketing, finance, media, settings
and audit.

```bash
npm run db:migrate      # create + apply a migration (dev)
npm run db:deploy       # apply migrations (production)
npm run db:push         # push schema without a migration (prototyping only)
npm run db:studio       # browse data in Prisma Studio
npm run db:seed         # idempotent seed
```

The seed is **idempotent** — every write is an upsert keyed on a natural unique
field, so running it repeatedly converges instead of duplicating rows.

---

## Seed data and demo accounts

All demo accounts share the password from `SEED_SUPER_ADMIN_PASSWORD`
(default `ChangeMe#2026`).

| Email | Role |
| --- | --- |
| `admin@wildpeaksouls.com` | SUPER_ADMIN |
| `ops@wildpeaksouls.com` | ADMIN |
| `content@wildpeaksouls.com` | CONTENT_MANAGER |
| `support@wildpeaksouls.com` | SUPPORT_AGENT |
| `finance@wildpeaksouls.com` | FINANCE_MANAGER |
| `traveller@example.com` | CUSTOMER |

> **Change these passwords immediately in any shared or public environment.**

The seed also loads 6 destinations, 8 activities, 6 events, 5 tours, 5
properties (12 room types), 4 visa countries with 5 visa types, 8 airports, 12
flight routes, 13 train services, 8 services, 3 travel guides, 6 policy pages,
16 FAQ items, 35 settings, a notice and an advertisement.

---

## Project structure

```
prisma/
  schema.prisma           Data model
  migrations/             Generated SQL migrations
  seed.ts                 Idempotent seed
src/
  app/
    (site)/               Public website (shared header/footer/notice shell)
    (auth)/               Login, register, OTP, password reset
    account/              Customer portal
    admin/                Staff dashboard
    api/                  Route handlers
    layout.tsx            Root layout, metadata, theme bootstrap
    globals.css           Design tokens + base styles
  components/
    ui/                   Button, card, field, badge, skeleton, states, …
    layout/               Header, footer, notice bar, theme provider
    booking/              Event, tour/activity and stay booking widgets
    checkout/             Payment form
    account/ admin/       Portal- and dashboard-specific components
    forms/                Public forms
  lib/
    auth/                 Session, password, OTP, tokens
    rbac/                 Permission catalogue, guards, dashboard nav
    validation/           Zod schemas
    data/                 Query layer (public / account / admin)
    booking.ts            Booking engine (capacity, pricing, inventory)
    settings.ts           Dashboard-managed configuration
    audit.ts              Audit log
    notifications.ts      Notification fan-out
    rate-limit.ts         Database-backed rate limiter
docs/                     Architecture, security, deployment, phases
```

---

## How the important parts work

### Prices are never trusted from the browser

The booking API accepts only what the customer is allowed to *choose* — product,
quantity, dates, add-ons and contact details. Every monetary value is recomputed
server-side from the catalogue and snapshotted onto the booking, so a catalogue
price change later never alters a historical booking.

### Capacity cannot be oversold

Seat and room-night claims run inside a **Serializable** transaction guarded by a
conditional update (`reservedSeats + quantity <= capacity`). If two requests race
for the last seat, exactly one matches the guard; the other is told honestly that
the seats have gone. Serialization conflicts are retried with jittered backoff
rather than surfaced as errors.

### Payment cannot be forged

Submitting a transaction ID creates a `PENDING_VERIFICATION` payment whose amount
comes from the booking, not the request body. Only a staff member holding
`payments.verify` can mark a booking paid — which also records the income
transaction, issues the invoice, notifies the customer and writes an audit entry.

### Authorization is server-side and object-level

Every protected page and API route re-checks the session and permissions on the
server. Middleware handles only request-shaped concerns; it never makes
authorization decisions. Customer-scoped queries filter by `userId` inside the
query itself, and another customer's record resolves to **404**, not 403, so
existence is never confirmed to a probing client.

### The dashboard menu is permission-driven

The sidebar is filtered on the server from the acting user's permissions, so a
module the user cannot access is never sent to the browser at all — and the page
behind it still enforces its own guard.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:*` | See [Database](#database) |

---

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set `AUTH_SECRET` (`openssl rand -base64 48`) and `NEXT_PUBLIC_SITE_URL`.
3. Run `npm run db:deploy` then `npm run db:seed` (first deploy only).
4. `npm run build && npm start`.
5. Sign in, **change the seeded passwords**, and configure Settings → payment
   numbers, contact details, analytics IDs.

Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.
`X-Powered-By` is disabled.

See `docs/DEPLOYMENT.md` for the full checklist.

---

## Verification

Verified end to end against a live PostgreSQL 16 database and a production
build, not a dev server:

- `npm run typecheck` — 0 errors
- `npm run lint` — 0 problems
- `npm run build` — succeeds
- Migrations apply cleanly from an empty database; the seed is idempotent

**143 automated assertions pass across five suites:**

| Suite | Checks | Covers |
| --- | --- | --- |
| Security & RBAC | 17 | Role rank, privilege escalation, self-protection |
| Catalogue CRUD | 40 | Create/update/delete, archive guards, validation |
| Dashboard access | 27 | Per-role page and API permissions |
| Booking lifecycle | 27 | Payment verification, invoices, concurrency |
| Public site & hardening | 32 | Lead capture, secrets, maintenance, headers, robots |

Plus **25 browser assertions** driven through a real Chromium at 1440px and
390px: create, validation failure, edit prefill, save, delete confirmation,
nested child rows, sidebar sub-navigation and collapse, the notification popup,
and no horizontal overflow on any page tested.

Highlights of what the suites prove:

- **20 concurrent bookings against 5 seats → exactly 5 sold, 0 errors**
- 12 concurrent stay bookings → no double-booking on any night
- An ADMIN cannot change or suspend a SUPER_ADMIN (404, state unchanged)
- Server-side price integrity — an injected `total` or `discount` is ignored
- A payment cannot be marked paid from the browser
- Cross-customer access blocked on pages, APIs and invoices
- Internal support notes never reach the customer
- Secrets absent from rendered HTML and client bundles
- Maintenance mode blocks the public site while staff keep dashboard access

**Lighthouse** against the production build, mobile profile, nine pages:
performance 95–97, accessibility 100, SEO 100.

See `docs/TESTING.md` for the full matrix and how to re-run it.

---

## Known limitations

These are deliberate scope boundaries, not defects:

- **No SMS/email provider is wired.** OTP codes and password-reset links are
  logged server-side. `src/lib/auth/otp.ts` and the forgot-password route are the
  integration points.
- **Google OAuth is scaffolded, not implemented.** The setting and button exist;
  `/api/auth/google` needs the provider exchange.
- **SSLCommerz is prepared, not live.** The method, toggle and payment model
  exist; the gateway callback is not implemented. bKash and Nagad run as manual
  verified transfers, as specified.
- **Flight and train data is informational.** Clearly labelled as such
  throughout. No GDS integration.
- **The AI assistant needs an API key.** Set `ANTHROPIC_API_KEY` to switch it
  on. Without one the endpoint says so plainly and points visitors at the
  contact form. It can also be turned off in Settings.
- **Live flight schedules need a provider key.** Set `FLIGHT_API_KEY` to enable
  the live adapter; without it the agency-maintained schedules are served and
  labelled as such. Trains have no public feed at all, and the page says so.
- **Cloudinary uploads need credentials.** Without them the media library still
  lists and deletes existing assets, and uploads are refused with an
  explanation rather than a failure.
- **Rate limiting is database-backed.** Correct across instances; move to Redis
  if request volume outgrows a table.
- The `prisma` CLI (a dev dependency) has a transitive advisory in
  `deepmerge-ts`. It affects build tooling only, not the runtime client.

---

## Documentation

| Document | Contents |
| --- | --- |
| `docs/ARCHITECTURE.md` | Layers, data flow, domain model, design system |
| `docs/SECURITY.md` | Threat model and how each control is implemented |
| `docs/TESTING.md` | Full verification matrix and how to reproduce it |
| `docs/DEPLOYMENT.md` | Production checklist |
| `docs/PHASES.md` | PRD phase status and what remains |
| `docs/V2_CHANGES.md` | What v2 added, what it fixed, and how it was verified |
| `docs/UPGRADING.md` | **Upgrading a live v1 database to v2 without losing data** |
# wild-peak-souls-travel

## 👨‍💻 Developer & Project Owner

<div align="center">

# Ataullah Mesbah

### High-Level • Super-Fast • Full-Stack Developer

Building **scalable, secure, high-performance digital products** with modern technologies.

</div>

---

## 🚀 About Me

I'm a passionate **Full-Stack Developer & Systems Engineer** focused on building scalable, high-performance web applications and digital systems.

I specialize in modern JavaScript ecosystems, cloud-native architectures, database-driven applications, performance optimization, and creating polished user experiences.

### What I Do

| Area                       | Focus                                                         |
| -------------------------- | ------------------------------------------------------------- |
| 🏗️ **Architecture**       | Scalable, maintainable & production-ready system architecture |
| ⚡ **Performance**          | Fast-loading, optimized & efficient applications              |
| 🔒 **Security**            | Secure authentication, authorization & data protection        |
| 🎨 **UI/UX**               | Clean, responsive & intuitive user experiences                |
| ☁️ **Cloud & DevOps**      | Vercel, AWS, Docker & modern deployment workflows             |
| 🗄️ **Backend & Database** | APIs, PostgreSQL, MongoDB & data-driven systems               |
| 🤖 **AI & Automation**     | AI-powered workflows, automation & intelligent systems        |

---

## 🛠️ Core Technologies

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge\&logo=next.js\&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=node.js\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge\&logo=postgresql\&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge\&logo=prisma\&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge\&logo=vercel\&logoColor=white)

</div>

---

## 📫 Connect With Me

<div align="center">

<a href="https://ataullahmesbah.com">
  <img src="https://img.shields.io/badge/🌐_Portfolio-ataullahmesbah.com-000000?style=for-the-badge" alt="Portfolio">
</a>

<a href="https://ataullahmesbah.com/contact">
  <img src="https://img.shields.io/badge/📧_Contact-Get_in_Touch-0A66C2?style=for-the-badge" alt="Contact">
</a>

<a href="https://github.com/ataullahmesbah">
  <img src="https://img.shields.io/badge/🐙_GitHub-ataullahmesbah-181717?style=for-the-badge&logo=github" alt="GitHub">
</a>

<a href="https://www.linkedin.com/in/ataullahmesbah">
  <img src="https://img.shields.io/badge/🔗_LinkedIn-Ataullah_Mesbah-0A66C2?style=for-the-badge&logo=linkedin" alt="LinkedIn">
</a>

</div>

---

## 🔗 Backlink to Developer

<div align="center">

### This project is proudly developed by

<a href="https://ataullahmesbah.com">
  <img src="https://img.shields.io/badge/⬅️_Back_to_Developer_Portfolio-ataullahmesbah.com-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Back to Developer Portfolio">
</a>

<br><br>

**Need a similar project?**

📩 **Hire me — Let's build something amazing together!**

<a href="https://ataullahmesbah.com/contact">
  <img src="https://img.shields.io/badge/💼_Work_With_Me-Contact_Ataullah_Mesbah-0A66C2?style=for-the-badge" alt="Hire Me">
</a>

</div>

---

<div align="center">

### ⚡ Built with passion, engineered for performance.

**© Ataullah Mesbah**

</div>
