<!-- START-HERE.md -->
# Wild Peak Souls — v2.4, complete website

The whole project, ready to run. Nothing else to merge.

Owner: **Ataullah Mesbah** — www.ataullahmesbah.com

---

## 1. Install

```bash
npm install
```

## 2. Environment

Copy `.env.example` to `.env` and fill in four things. Everything else is
optional and documented inline in that file.

```bash
DATABASE_URL="postgresql://…"                 # your Neon pooled string
AUTH_SECRET="…"                               # openssl rand -base64 48
NEXT_PUBLIC_SITE_URL="https://your-domain.com" # no trailing slash
CLOUDINARY_URL="cloudinary://key:secret@cloud" # the single line Cloudinary shows
```

**On Windows, add these two as well** — they avoid the Turbopack panic
(`os error 1392`) described in `docs/TROUBLESHOOTING.md`:

```bash
WPS_TURBOPACK_SOURCEMAPS=off
WPS_DIST_DIR=.next-clean
```

## 3. Database

Your existing data is safe. These only add — no table is dropped, no row is
touched.

```bash
npx prisma generate
npm run db:deploy     # applies the 4 migrations
npm run db:upgrade    # grants permissions, adds starter blog categories
```

Only on a brand-new empty database, seed demo content:

```bash
npm run db:seed       # NOT for a database that already has your data
```

## 4. Check everything before you start

```bash
npm run doctor
```

It verifies the environment variables, which Cloudinary form was picked up
(never printing the secret), the database connection, whether the migrations
and blog permissions actually applied, and whether anything in the build
folder is unreadable. Every failure names the command that fixes it.

```bash
npm run db:check      # the two database URLs specifically
```

## 5. Run

```bash
npm run dev           # http://localhost:3000
npm run build && npm start
```

---

## Commands

| | |
| --- | --- |
| `npm run dev` | development server |
| `npm run dev:webpack` | development server on webpack instead of Turbopack |
| `npm run clean` | delete the build folder |
| `npm run doctor` | check the whole setup |
| `npm run db:check` | check DATABASE_URL and DIRECT_DATABASE_URL |
| `npm run db:deploy` | apply migrations |
| `npm run db:upgrade` | permissions, settings, starter categories (safe to repeat) |
| `npm run db:seed` | demo content — empty database only |
| `npm run build` / `npm start` | production |
| `npm run lint` / `npm run typecheck` | checks |

## Documentation

| File | What is in it |
| --- | --- |
| `docs/TROUBLESHOOTING.md` | the Windows Turbopack panic, Cloudinary, dead seed images |
| `docs/DEPLOYMENT.md` | Vercel step by step, pooled vs direct connection strings, slow-query log |
| `docs/UPGRADING.md` | applying an update to a live database, blog permissions table |
| `docs/SECURITY.md` | JSON-LD serialisation, comments, partial updates, RBAC |
| `docs/ARCHITECTURE.md` | the domain map |
| `docs/TESTING.md` | what is covered |

## First login

Whatever you set as `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`
before running `db:seed`. **Change the password immediately after signing in.**

## What is in this version

Everything from before, plus:

- **Contest** at `/contest` — entries from signed-in visitors with photo or
  video upload, public voting, judging and a winners announcement, all run from
  the dashboard. The navbar link and the home page section appear on their own
  while a contest is live.
- **Blog** at `/blog` — card grid, sidebar (trending, categories, topics),
  category pages, Markdown articles with in-body images, related posts, and
  reader comments moderated from the dashboard. `/guides` redirects to it.
- **Database at scale** — trigram search indexes, serverless connection
  pooling, an optional slow-query log.
- **Cloudinary** accepts the single `CLOUDINARY_URL` line, and says which
  variable is missing when it cannot find one.
- **`npm run doctor`** and **`npm run db:check`**.
- Two security fixes: JSON-LD could no longer be used to inject script, and a
  partial API update no longer reverts published content to draft.

Verified before packaging: 320 automated checks passing (security 17, CRUD 40,
admin 27, booking flow 27, site-wide 32, blog 87, browser UI 25, image upload
15, Markdown renderer 36, Cloudinary config 14), a clean production build, and
Lighthouse accessibility and SEO at 100 across the blog, an article, a category
page and the home page.
