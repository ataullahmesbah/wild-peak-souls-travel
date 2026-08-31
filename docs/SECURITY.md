<!-- docs/SECURITY.md -->
# Security

How each control in the PRD's security requirements is actually implemented,
and where to find it.

---

## The PRD's acceptance criteria

A feature is **not** complete if any of these are true. Each is addressed below
and covered by the test matrix in `docs/TESTING.md`.

| Criterion | Status | Where |
| --- | --- | --- |
| Only frontend authorization exists | Addressed | every page and route re-checks server-side |
| API can be called by unauthorized users | Addressed | `requireUser` / `requirePermission` on all protected routes |
| Sensitive secrets are sent to the browser | Addressed | secrets are server-only; verified by test |
| A customer can access another customer's data | Addressed | ownership filtered inside the query; 404 not 403 |
| A booking can overbook under concurrency | Addressed | Serializable transaction + conditional guard |
| Payment success can be forged from the browser | Addressed | client claim ≠ payment; staff verification required |

---

## Authentication

**Passwords** — bcrypt, cost 12 (`src/lib/auth/password.ts`). `verifyPassword`
burns a comparison against a dummy hash when the user has no password, so
"account exists without a password" and "wrong password" take comparable time.

**Sessions** — `src/lib/auth/session.ts`. A signed JWT (HS256, `jose`) in an
HTTP-only, SameSite=Lax, `Secure`-in-production cookie. The JWT references a
`Session` row that must exist and be unrevoked:

> The token alone is never sufficient. Logout, suspension and password change
> revoke the row and take effect on the very next request.

`getCurrentUser()` is memoized per request with React `cache`, so a layout, page
and child component checking auth issue a single query.

**No user enumeration** — login returns an identical 401 and identical message
whether the identifier is unknown or the password is wrong. `/api/auth/otp/request`
and `/api/auth/password/forgot` always return success regardless of whether the
account exists.

**OTP** — `src/lib/auth/otp.ts`. 6 digits from `crypto.randomInt`, bcrypt-hashed
before storage, 10-minute expiry, 5 attempt cap, consumed on success, and
previous challenges for the same identifier+purpose are invalidated on reissue.
The code is **never** returned through the API; in development it is logged
server-side only.

**Password reset** — opaque 32-byte token, SHA-256 hashed before storage, so a
database leak cannot be replayed into a usable link. 30-minute expiry,
single-use, and consuming it revokes every session for that user.

---

## Authorization

`src/lib/rbac/` — a `module.action` permission catalogue (58 permissions), a
default role→permission mapping, and guards.

**Always test a permission, never a role.** `hasPermission()` is the single
predicate. `SUPER_ADMIN` short-circuits; everyone else is checked against their
effective permission set.

**Page guards** redirect (`requirePermissionPage` → `/admin/forbidden`).
**API guards** throw `AuthError`, mapped to 401/403/404 by `apiHandler`.

**Object-level checks** are inside the query, not beside it:

```ts
// account.ts — the ownership filter is part of the lookup
prisma.booking.findFirst({ where: { id: bookingId, userId } })
```

A record belonging to someone else resolves to `null` → **404**. Returning 403
would confirm the record exists.

**Privilege escalation is blocked explicitly** (`/api/admin/users/update`):

- Role changes and status changes are separately permissioned.
- Only a `SUPER_ADMIN` may grant `SUPER_ADMIN`.
- Nobody may deactivate their own account (lockout guard).
- Suspending a user revokes all their sessions immediately.

**Middleware makes no authorization decisions.** It cannot reach the database to
confirm a session is still valid, so treating a cookie's presence as proof of
access would be exactly the "frontend route hiding" the PRD forbids. It only
attaches the pathname header.

---

## Input validation

Every route body is parsed by a Zod schema (`src/lib/validation/`). Zod strips
unknown keys, which is what makes the price-injection attack inert: extra fields
like `total` or `discount` simply never reach the handler.

`ZodError` is caught centrally and returned as a 422 with per-field messages —
never a stack trace.

---

## Booking and payment integrity

**Prices** are recomputed server-side from the catalogue on every booking. The
client can choose *what* and *how many*, never *for how much*. Amounts are then
snapshotted onto `BookingItem` so later catalogue edits cannot rewrite history.

**Capacity** — see `docs/ARCHITECTURE.md`. Serializable isolation plus a
conditional update; serialization conflicts retried, never surfaced as errors.

**Payments** — a customer submitting a transaction ID creates a
`PENDING_VERIFICATION` row whose `amount` is read **from the booking**, not the
request. Nothing a customer can send moves a booking to `PAID`. Only
`payments.verify` does, and that action:

1. flips payment and booking status in one transaction,
2. writes the `FinancialTransaction`,
3. issues the invoice,
4. notifies the customer,
5. writes an audit record naming the acting staff member.

Re-verifying an already-processed payment returns 409.

---

## Rate limiting

`src/lib/rate-limit.ts` — database-backed fixed-window counters, so limits hold
across serverless instances rather than per-process.

| Bucket | Limit |
| --- | --- |
| Login | 8 / 5 min — bucketed by **IP and by identifier**, so neither a spray across accounts nor a focused attack from many IPs gets through |
| Signup | 5 / 15 min |
| OTP request / verify | 5 and 10 / 15 min |
| Password reset | 5 / 15 min |
| Public forms | 10 / 10 min |
| Support tokens | 8 / hour |
| Messages | 40 / 10 min |
| Booking creation | 12 / 10 min |

The limiter **fails open** if its own table is unavailable — the action is still
authenticated, authorized and validated downstream, and locking every user out of
the site is the worse failure.

---

## Secrets

- `AUTH_SECRET`, `DATABASE_URL` and `CLOUDINARY_API_SECRET` are read only in
  `server-only` modules.
- `Setting` rows carry an `isSecret` flag. `getPublicSettings()` filters them
  out; the settings form renders a placeholder, never the value; and a blank
  submission means "keep the stored value" rather than clearing it.
- Audit metadata records secret changes as `[redacted]`.
- Verified by test: no secret appears in any rendered HTML or client bundle.

---

## File uploads

`src/lib/cloudinary.ts`. Uploads are **signed server-side** and posted directly
to Cloudinary, so the API secret never reaches the browser. The signature pins
the folder and timestamp, so a leaked signature cannot be reused to write
elsewhere. MIME type is allow-listed (JPEG/PNG/WebP/AVIF) and size capped at 8 MB
— validated server-side, never trusting the filename extension.

---

## Audit logging

`src/lib/audit.ts`. Immutable records of security- and money-sensitive actions:
logins and failures, role and status changes, booking transitions, payment
verification and rejection, review moderation, settings and maintenance changes.

Each entry captures actor, action, entity, metadata, IP and user agent. The
dashboard exposes audit logs as **read-only** behind `audit.read`; there is no
edit or delete path. Audit failures are swallowed after logging — an audit
problem must never break the business operation that triggered it.

---

## Output safety

- React escapes by default. The only `dangerouslySetInnerHTML` uses are the
  theme bootstrap script and JSON-LD, both built from server-controlled values.
- The invoice route builds HTML directly, so every interpolated value goes
  through an explicit `escapeHtml()`.
- Prisma parameterizes all queries. The one raw statement (the room-inventory
  guard) uses tagged-template parameter binding, not string concatenation.
- `apiHandler` guarantees no raw database or stack text reaches a client.
- The root `error.tsx` shows a support reference digest, never the message.

---

## Transport and headers

Set in `next.config.ts` for every response:

`Strict-Transport-Security` (2 years, preload) · `X-Content-Type-Options: nosniff`
· `X-Frame-Options: SAMEORIGIN` · `Referrer-Policy: strict-origin-when-cross-origin`
· `Permissions-Policy` (camera, microphone, FLoC denied)

`X-Powered-By` is disabled.

> **CSP** is intentionally *not* set here. The PRD warns against shipping a
> policy that breaks integrations untested. Analytics vendors are
> dashboard-configurable, so the correct CSP depends on what an operator enables.
> Add it per-deployment once the enabled integrations are known.

---

## Privacy

- Public queries never project customer PII. Reviews expose display name and
  avatar only.
- Internal support notes are excluded from customer queries at the data layer,
  and a customer's `internal: true` flag is ignored server-side — only staff can
  create one.
- Visa documents are described as retained only for the duration of an
  application.
- The AI assistant (not yet built) is designed to sit on `lib/data/public.ts`,
  which already excludes every private field.

---

## Maintenance mode

A `SUPER_ADMIN` toggle. When on, the public layout redirects non-staff to
`/maintenance` while staff retain both public and dashboard access — so an
operator cannot lock themselves out. Toggling it is separately permissioned
(`maintenance.toggle`) on top of `settings.update`, and is audited.

---

## Reporting

Found something? Contact the maintainers privately rather than opening a public
issue.

## JSON-LD serialisation

Structured data is emitted only through `<JsonLd>` from
`src/components/seo/json-ld.tsx`, never a hand-written
`<script type="application/ld+json">`.

`JSON.stringify` escapes what JSON requires but knows nothing about HTML: the
string `</script>` passes through it unchanged, and inside a script element the
HTML parser ends the element there. Everything after it is parsed as markup.
Since every JSON-LD block on the site carries database content — a post body,
an event title, an FAQ answer, the brand name typed into Settings — anyone able
to edit that content could have run script in every visitor's browser,
including an administrator's. With the blog, that set now includes the
MODERATOR role.

`serialiseJsonLd` escapes `<`, `>`, `&`, U+2028 and U+2029 as JSON unicode
escapes. They are ordinary JSON, so `JSON.parse` — and Google, and any AI
crawler — decodes them back to the original characters and the structured data
is unchanged; only the HTML parser is prevented from seeing a tag.

If you add a page with structured data, use the component. A raw
`dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` reintroduces the
hole.

## Reader comments

Comments are the only place a member of the public writes a row. Five things
stand between a stranger and the page, all in
`src/app/api/blog/comments/route.ts`:

1. a honeypot field no human ever sees;
2. a per-IP rate limit;
3. Zod validation with a hard length cap;
4. the post must be published and have comments open — a draft's id is not a
   way to attach a comment to something nobody is moderating;
5. the row is written `PENDING`. Nothing on this path can publish anything.

Comment bodies are rendered as plain text through JSX, never as Markdown and
never as HTML. A post author is a member of staff whose formatting is worth
supporting; a commenter is anybody on the internet.

`authorEmail` and `ipHash` are absent from every public projection in
`src/lib/data/blog.ts`, so the public page cannot render them even by mistake.
The IP is stored only as a truncated SHA-256 hash — enough to correlate abuse,
not enough to recover the address.

## Partial updates

`partialForUpdate` in `src/lib/validation/common.ts` builds every PATCH schema.
Plain `.partial()` is not safe: Zod leaves `.default()` in place, so a PATCH
that omits a key still parses to the default and writes it. That meant
`PATCH /api/dashboard/tours/<id> {"title":"…"}` silently reset `status` to
DRAFT — unpublishing a live tour — along with every other defaulted field. A
PATCH must touch only what it names.

## Contest entries: the one public upload path

Entrants are members of the public, not staff, so contest uploads cannot use
the dashboard's media endpoints — those require `media.upload`. The dedicated
path in `src/app/api/contest/` is deliberately narrow:

1. **Signed in.** Every entry is attached to an account, so one person cannot
   enter repeatedly under different names and there is somebody to contact if
   they win.
2. **The contest must be open.** Published, and inside its entry window, judged
   by the same `isAcceptingEntries` the page uses — so the form disappearing
   and the API refusing happen at the same instant.
3. **The folder is pinned server-side** and included in the Cloudinary
   signature, per contest. A signature cannot be replayed to write elsewhere in
   the account.
4. **Rate limited** per user.
5. **The upload is verified, not trusted.** `fetchAsset` reads the file back
   from Cloudinary's admin API and checks the resource type, the byte size and,
   for video, the duration. A page can claim a 40 MB video is 900 KB and two
   seconds long; without this the contest rules would be advisory. Anything
   that fails is deleted from Cloudinary before the error is returned.
6. **Nothing is public until a human approves it.** Entries are written
   `PENDING`, and `src/lib/data/contest.ts` never projects a pending row.

Entrants' contact details — email, phone, the hashed IP — are absent from every
public select in that file, so a component cannot render them by accident. The
public sees a name, a location and a description.

## One vote per person

`ContestVote` carries `@@unique([contestId, userId])`, and that constraint is
the whole anti-ballot-stuffing design. A "has this person voted?" query
followed by an insert would let two simultaneous requests both pass; the
database refuses the second write however the requests interleave.

The duplicate is recognised by reading Prisma's `code === 'P2002'` rather than
with `instanceof`. This project has both `@prisma/client` and a generated
client under `src/generated`, and an error raised through one is not an
instance of the other's class — an `instanceof` check here silently fell
through to the generic handler and returned the wrong status.

The vote row and the denormalised counter are written in one transaction, so
the number shown can never drift from the number of ballots.
