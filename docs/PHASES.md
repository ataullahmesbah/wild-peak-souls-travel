# PRD phase status

Against the phase plan in `00_MASTER_PRD.md` §44.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository assessment and architecture | **Complete** |
| 1 | Foundation — Next.js, TS, Tailwind, theme, UI system, PostgreSQL/Prisma, auth, RBAC, admin shell, security | **Complete** |
| 2 | Public website + CMS — home, about, services, contact, notices, ads, maintenance, SEO | **Complete** |
| 3 | Travel — destinations, events, tours, activities, itinerary, capacity, booking | **Complete** |
| 4 | Stays — properties, rooms, availability, date blocking, booking | **Complete** |
| 5 | Checkout/payments — checkout, bKash, Nagad, SSLCommerz foundation, invoices, refund/cancellation | **Complete for manual methods**; SSLCommerz prepared, not live |
| 6 | Visa | **Complete** |
| 7 | Flights + Bangladesh train schedule | **Complete** as informational modules, per the PRD's non-goals |
| 8 | Customer portal + messaging + notifications + support | **Complete** |
| 9 | Finance/accounts + reports + audit | **Complete** for read, reporting and the automatic income ledger; expense/salary entry forms not built |
| 10 | Analytics + marketing | **Settings and models complete**; tag injection not wired |
| 11 | AI assistant | **Not built** |
| 12 | Security/performance/SEO hardening and production launch | **Complete** except CSP, which is deliberately per-deployment |

---

## What remains, and where to start

### Wire an SMS/email provider
`src/lib/auth/otp.ts` and `src/app/api/auth/password/forgot/route.ts` both have a
single clearly-marked integration point. OTP is fully implemented — hashing,
expiry, attempt caps, rate limiting, resend cooldown — it just needs a transport.
Until then codes and reset links are logged server-side.

### Complete Google OAuth
`/api/auth/google` needs the authorization-code exchange. The `OAuthAccount`
model, the dashboard toggle and the UI already exist, and the toggle only shows
the button when credentials are actually configured.

### Complete SSLCommerz
The `PaymentMethod` enum, the dashboard toggle and the `Payment` model handle it;
what is missing is the gateway session creation and the IPN callback. Follow the
same rule the manual flow follows: **only a trusted server-side signal may mark a
payment paid**.

### Analytics tag injection
IDs are stored (GA4, GTM, Meta Pixel) and the CAPI token is stored as a secret.
Injecting the tags into `layout.tsx` from settings is the remaining work; the
secret must stay server-side.

### Admin CRUD forms
The dashboard currently reads, filters and acts on every module (status changes,
payment verification, review moderation, role and settings updates). Full
create/edit forms exist for settings, users, bookings, payments, support, reviews
and leads. Catalogue records (destinations, events, tours, activities, stays) are
seeded or managed through Prisma Studio; building their forms is mechanical work
on top of the existing validation schemas and the `useApiForm` hook.

### AI assistant
The retrieval layer it should sit on already exists: `src/lib/data/public.ts`
returns only published content with every private field excluded by construction.
Build the assistant against that module and it cannot reach private data.

### Automated tests
Verification to date was performed against the running application (see
`docs/TESTING.md`). Committing Vitest unit tests for the booking engine and
Playwright end-to-end tests for the booking and payment flows would make that
verification repeatable in CI.
