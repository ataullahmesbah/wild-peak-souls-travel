# Verification

What was tested, how, and how to reproduce it.

Everything below was executed against a live PostgreSQL 16 database with the
production build (`next build` + `next start`), not against mocks.

---

## Static checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` | 0 problems |
| `npm run build` | succeeds — 36 routes |
| `prisma migrate dev` from an empty database | applies cleanly |
| `npm run db:seed` run twice | idempotent — row counts unchanged |

---

## Functional and security matrix

**105 assertions, 0 failures.**

### 1. Unauthenticated access (5/5)

Every protected API returns **401** with no session:
`/api/bookings/event`, `/api/payments/submit`, `/api/admin/payments/verify`,
`/api/admin/users/update`, `/api/admin/settings`.

### 2. Registration and validation (6/6)

Weak password, mismatched confirmation and unaccepted terms all rejected with
422. Valid registration succeeds. Duplicate email returns 409 with a message
that does not reveal which field collided.

### 3. No user enumeration (3/3)

Wrong password and unknown account both return **401** with a byte-identical
body:

```
{"error":"Those credentials do not match an account.","code":"INVALID_CREDENTIALS"}
```

### 4. Booking validation and price integrity (9/9)

A booking posted with attacker-supplied `total: 1`, `subtotal: 1`,
`discount: 99999` and `unitPrice: 1`:

| Field | Client claimed | Stored |
| --- | --- | --- |
| total | `1` | **21800.00** |
| discount | `99999` | **3200.00** |

Both computed server-side from the catalogue. Terms rejection, zero quantity and
booking a `SOLD_OUT` event are all refused. Seats are claimed on the event row.

### 5. Payment forgery (6/6)

A customer submitting `{"amount": 1, "status": "PAID"}` alongside their
transaction ID:

- booking → `PENDING_VERIFICATION`, **not** paid
- payment row → `PENDING_VERIFICATION`, **not** paid
- payment amount → **21800.00**, taken from the booking, not the request
- customer calling the verification endpoint → **403**
- booking still unpaid afterwards

### 6. Object-level authorization (6/6)

With two customers (Alice and Bob), Bob receives **404** — never 403 — on
Alice's booking page, checkout page, invoice, payment endpoint and cancel
endpoint. Alice reaches her own booking with 200.

### 7–9. RBAC across all six staff roles (26/26)

All roles sign in. Page access matches the permission matrix:

| Role | `/admin/events` | `/admin/finance` | `/admin/users` | `/admin/settings` | `/admin/audit` |
| --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ (read) | ✅ |
| CONTENT_MANAGER | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| SUPPORT_AGENT | ✅ | ⛔ | ⛔ | ⛔ | ⛔ |
| FINANCE_MANAGER | ⛔ | ✅ | ⛔ | ⛔ | ⛔ |
| CUSTOMER | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |

Privilege escalation blocked:

- CONTENT_MANAGER changing roles → 403
- SUPPORT_AGENT verifying payments → 403
- CONTENT_MANAGER writing settings → 403
- CUSTOMER moderating reviews → 403
- **ADMIN granting SUPER_ADMIN → 403** (target's role verified unchanged)
- **SUPER_ADMIN suspending own account → 409** (account verified still ACTIVE)

### 10. Payment lifecycle (15/15)

Full path verified in the database at each step:

```
customer submits claim   → PENDING_VERIFICATION, no invoice, no ledger entry
FINANCE_MANAGER verifies → CONFIRMED + PAID
                         → invoice issued
                         → income transaction recorded, amount == booking total
                         → audit entry written
                         → customer notified
re-verify                → 409
customer downloads invoice → 200 · other customer → 404
```

### 11. Cancellation releases inventory (5/5)

Cancelling returns the seats (14 → 13), flips the event back from `SOLD_OUT` to
`PUBLISHED`, sets the booking to `CANCELLED` and writes an audit entry.

### 12. Support privacy (7/7)

An agent's `internal: true` note is stored as `INTERNAL_NOTE` and is **absent**
from the customer's rendered page, while the agent's normal reply **is** present.
A customer posting `internal: true` has the flag ignored — the message is stored
as `CUSTOMER`.

### 13. Public lead capture (8/8)

Contact, custom tour, visa request, flight inquiry and newsletter all persist and
notify the right staff. The honeypot field silently drops a bot submission with
no row written. A flight inquiry stores the displayed price as indicative.

### 14. Secrets (5/5)

A canary value written into a secret setting appears in **0** rendered pages
(home, events, `/admin/settings`, `/account`). Password hashes appear in 0
pages. `AUTH_SECRET` and `DATABASE_URL` appear in **0** client bundles. The
session cookie is `HttpOnly`.

### 15. Maintenance mode (6/6)

| Visitor | Result |
| --- | --- |
| Anonymous | redirected |
| Customer | redirected |
| Staff — public site | **200** |
| Staff — dashboard | **200** |

Toggling it off restores the site.

### 16–17. Headers and SEO (11/11)

All five security headers present, `X-Powered-By` absent. `robots.txt` disallows
`/admin`, `/account`, `/checkout` and `/api/`. The sitemap lists published events
and contains **no** admin URLs.

---

## Concurrency

This is the PRD's explicit acceptance criterion: *"Booking can overbook under
concurrent requests"* is a failure condition.

### Event seats — 20 simultaneous requests, 5 seats available

```
HTTP responses:      5 × 201     15 × rejected     0 × 500
reservedSeats  = 14 / 14
sum(bookings)  = 5
event status   = SOLD_OUT
```

Exactly five sold, capacity never exceeded, and the event flipped itself to
`SOLD_OUT` on the last seat.

> **A bug was found and fixed here.** The first run produced six `500`s from
> PostgreSQL serialization failures (`40001` / Prisma `P2034`) — expected under
> Serializable isolation, but they surfaced to customers as "something went
> wrong" and lost bookings that should have succeeded. `withSerializationRetry()`
> in `src/lib/booking.ts` now retries with jittered backoff. Re-run: zero errors.

### Room-nights — 12 simultaneous requests, 3 units available, 2 units each

```
HTTP responses:      1 × 201     11 × 409     0 × 500

2026-10-07  booked=2/3
2026-10-08  booked=2/3
2026-10-09  booked=2/3

nights overbooked   = 0
room holds recorded = 3  (one per night)
```

No double-booking on any night.

---

## Browser verification

Rendered with Chromium at 1440px and 390px, in both colour schemes:

- light and dark: home, events listing, event detail, visa detail, stay detail,
  flight explorer, login
- mobile: home
- authenticated dashboard: admin home, bookings

Confirmed: both themes render from the token system, live seat counts match the
database, sold-out events are labelled, the flight and train disclosures are
visible, and the dashboard sidebar shows only permitted modules.

---

## Reproducing

```bash
# 1. A database
createdb wild_peak_souls
export DATABASE_URL="postgresql://…/wild_peak_souls"
export AUTH_SECRET="$(openssl rand -base64 48)"

# 2. Schema + data
npm run db:deploy && npm run db:seed

# 3. Production build
npm run build && npm start

# 4. Static checks
npm run typecheck && npm run lint
```

Then exercise the flows above. The concurrency test is a burst of parallel
`curl` calls against `/api/bookings/event` for an event with known remaining
capacity, asserting on `Event.reservedSeats` and `SUM(Booking.quantity)`
afterwards.

> The per-user booking rate limit (12 / 10 min) will throttle a 20-request burst
> from one account. Raise `RATE_LIMITS.BOOKING_CREATE` temporarily, or spread the
> burst across accounts, to exercise the transaction rather than the limiter.

---

## Not covered

- No automated test suite is committed. The verification above was performed
  against the running application; adding Vitest/Playwright suites is the
  natural next step.
- No load testing beyond the concurrency bursts described.
- Google OAuth and SSLCommerz are not implemented, so neither is tested.
