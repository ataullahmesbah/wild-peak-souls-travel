# Deployment

## Requirements

- Node.js 20.9+
- PostgreSQL 14+ (developed and verified against 16)
- Optional: Cloudinary account for media uploads

---

## First deploy

### 1. Environment

```bash
DATABASE_URL="postgresql://user:pass@host:5432/wild_peak_souls?schema=public"
AUTH_SECRET="$(openssl rand -base64 48)"       # 32+ chars, keep it secret
NEXT_PUBLIC_SITE_URL="https://your-domain.com"  # no trailing slash
```

Optional:

```bash
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=…

GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…

SEED_SUPER_ADMIN_EMAIL=you@your-domain.com
SEED_SUPER_ADMIN_PASSWORD='a strong one-time password'
```

`AUTH_SECRET` shorter than 32 characters fails validation at startup, by design.

### 2. Schema and seed

```bash
npm ci
npm run db:deploy    # applies migrations — never use db:push in production
npm run db:seed      # roles, permissions, settings (+ demo content)
```

The seed is idempotent and safe to re-run; it refreshes setting *metadata* but
never overwrites a value an operator has changed.

To skip demo content, run the seed once for roles/permissions/settings, then
delete the sample catalogue rows from the dashboard or Prisma Studio.

### 3. Build and run

```bash
npm run build
npm start
```

### 4. Post-deploy checklist

- [ ] Sign in and **change every seeded password**
- [ ] Settings → General: brand, contact details, address, social links
- [ ] Settings → Payment: real bKash / Nagad numbers and instructions
- [ ] Settings → SEO: title, description, OG image; `robotsIndex` **off** on staging
- [ ] Settings → Analytics: GA4 / GTM / Meta IDs if used
- [ ] Settings → Business: cancellation window, minimum advance hours
- [ ] Create real staff accounts; remove or suspend the demo ones
- [ ] Verify `/robots.txt` and `/sitemap.xml`
- [ ] Confirm HTTPS and that HSTS is being served

---

## Platform notes

### Vercel / Netlify (serverless)

Works as-is, but the database connection needs one deliberate setting.

**Why.** Each Prisma client owns a connection pool sized `(CPU cores x 2) + 1`
by default — about 9. A long-running server holds one such pool forever, which
is fine. Serverless does not work that way: Vercel runs many independent
function instances, and *each* one builds its own pool. Thirty warm instances
at 9 connections each is 270 connections against a database whose
`max_connections` is typically 100 (and far lower on a free tier). The result
is `FATAL: sorry, too many clients already` under exactly the traffic you
wanted.

Two things fix it, and both live in the connection string:

```bash
# App runtime — the provider's POOLED (PgBouncer) endpoint
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1&pool_timeout=20&sslmode=require"
```

| Parameter | Why |
| --- | --- |
| pooled host/port | PgBouncer multiplexes thousands of client connections onto a handful of real PostgreSQL backends |
| `pgbouncer=true` | stops Prisma using named prepared statements, which PgBouncer's transaction mode cannot carry across connections. Without it you get intermittent `prepared statement "s0" already exists` |
| `connection_limit=1` | one real connection per function instance, so the total scales with the pooler and not with the pool size |
| `pool_timeout=20` | queue for a free connection for 20s rather than erroring immediately at a traffic spike |

Where the pooled endpoint lives:

| Provider | Pooled endpoint |
| --- | --- |
| Supabase | same host, port `6543` (port `5432` is direct) |
| Neon | the `-pooler` variant of the hostname |
| Railway / Render | add PgBouncer, or use the provider's pooler add-on |
| Prisma Accelerate | a `prisma://` URL, which pools for you |

None of this is Vercel-specific — it is standard PostgreSQL plus PgBouncer, so
moving to a VPS, Railway, or a managed container later is a change to this one
line. On a host where the app is a long-running process, drop
`pgbouncer`/`connection_limit` and let Prisma size the pool itself.

**Migrations.** DDL needs a real session connection, so it must not go through
the transaction-mode pooler. Run the release step against the direct string:

```bash
DATABASE_URL="$DIRECT_DATABASE_URL" npm run db:deploy
```

Run it as a **release/post-deploy step, not at build time** — a build may run
on a machine with no database access, and running migrations from several
concurrent builds is how you corrupt a migration history.

**Vercel free tier, start to finish**

1. Create the database (Supabase and Neon both have a free tier that includes a
   pooler).
2. In Vercel → Settings → Environment Variables add `DATABASE_URL` (pooled,
   with the four parameters above) and `DIRECT_DATABASE_URL` (direct), plus
   `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` and the Cloudinary keys.
3. Set the install command to `npm ci` and leave the build command as
   `npm run build`.
4. Add the release step above so `db:deploy` runs after the build.
5. Deploy, then open `/api/health` and sign in.

The free tier's limits you will meet first are function execution time and
the database's own connection cap — both of which the settings above are what
keeps you under.

### Watching for slow queries

Set `SLOW_QUERY_MS` to a millisecond threshold (start at `300` in production)
and any query above it writes a single line to the server log:

```
[slow-query] 412ms SELECT "public"."Booking"."id" FROM "public"."Booking" WHERE "public"."Booking"."contactEmail"::text LIKE $1 ...
```

Only the prepared statement is logged. Values remain `$1`, `$2` placeholders,
so customer names, emails and phone numbers never reach the log, and any
inlined string literal is replaced with `'?'` before writing.

Leave the variable unset and no listener is attached at all, so there is no
overhead until you ask for it. On Vercel the lines appear under
Deployment → Runtime Logs; on a VPS, wherever the process's stdout goes.

### Text search indexes

`prisma/migrations/20260829120000_search_trigram_indexes` installs `pg_trgm`
and adds GIN indexes to every column the dashboard and public site search with
a "contains" filter (booking number, customer name/email/phone, user, audit
log, destination, event, tour, activity, stay, train station, visa country,
FAQ). A plain btree index cannot serve a leading-wildcard `ILIKE '%…%'`, so
those searches were sequential scans that got linearly slower as data grew.

Measured on a 100,000-row table:

| Query | Without | With |
| --- | --- | --- |
| Booking search across 4 columns | 158.8 ms (seq scan) | 0.6 ms (bitmap index scan) |
| Pagination `count(*)` on a filtered title | 46.2 ms | 14.5 ms |

The cost is disk: roughly 3-4 MB of index per 100,000 rows per indexed column.

If the host does not let the application role install extensions, the
migration logs a notice and skips the indexes rather than failing the deploy —
the site keeps working, searches simply fall back to a scan. Ask the provider
to enable `pg_trgm` (Supabase, Neon and RDS all offer it), then re-run:

```bash
psql "$DIRECT_DATABASE_URL" -f prisma/migrations/20260829120000_search_trigram_indexes/migration.sql
```

The migration body is idempotent, so re-running it is safe.

### Docker / VPS

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
```

Put TLS termination in front (nginx, Caddy, a load balancer) and forward
`X-Forwarded-For` so rate limiting and audit logs record the real client IP.

---

## Content Security Policy

Deliberately not shipped. The correct policy depends on which analytics vendors
an operator enables in Settings, and the PRD warns against shipping an untested
CSP. Once your integrations are fixed, add a `Content-Security-Policy` header in
`next.config.ts` and test every page — particularly the inline theme bootstrap
script in `src/app/layout.tsx`, which needs a nonce or hash.

---

## Backups

Back up PostgreSQL on a schedule. Bookings, payments, invoices and audit logs are
business records with legal retention requirements.

```bash
pg_dump "$DATABASE_URL" | gzip > wps-$(date +%F).sql.gz
```

Always take a backup before running a migration that drops or alters a column.

---

## Housekeeping

Two helpers exist for periodic cleanup — call them from a cron route or a
scheduled job:

- `pruneRateLimitCounters()` — `src/lib/rate-limit.ts`
- `pruneExpiredOtps()` — `src/lib/auth/otp.ts`

---

## Scaling

- **Database** is the first bottleneck. Indexes are in place on every filtered
  column; add a read replica for reporting before optimising anything else.
- **Rate limiting** is a database table. Move it to Redis if writes become hot.
- **Sessions** are database-backed by design — that is what makes instant
  revocation possible. Cache reads at the edge only if you accept a revocation
  delay.
- **Booking transactions** run at Serializable. Under very heavy contention on a
  single event, raise the retry count in `withSerializationRetry`.
