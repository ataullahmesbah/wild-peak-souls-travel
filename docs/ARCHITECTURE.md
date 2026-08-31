# Architecture

## Principles

1. **Server-first.** Everything is a Server Component unless it needs
   interactivity. Client components are small leaves — forms, toggles, widgets.
2. **The server is the authority.** Prices, availability, permissions and
   payment state are decided server-side. The browser renders decisions; it
   never makes them.
3. **Status over deletion.** Business records carry a status field. Historical
   bookings and financial records are never destroyed by an edit elsewhere.
4. **Configuration lives in the database.** If a business user should be able to
   change something without a deploy, it is a `Setting`, a CMS row, or a
   catalogue record — not a constant.

---

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  app/          Routes. Pages guard, fetch and compose.        │
│                API handlers validate → authorize → act → audit│
├──────────────────────────────────────────────────────────────┤
│  components/   Presentation. No data fetching, no business    │
│                logic. Client components only where needed.    │
├──────────────────────────────────────────────────────────────┤
│  lib/data/     Query layer. Explicit `select` on every query.  │
│                public.ts | account.ts | admin.ts              │
├──────────────────────────────────────────────────────────────┤
│  lib/          Domain logic: booking engine, RBAC, auth,       │
│                settings, audit, notifications, rate limiting.  │
├──────────────────────────────────────────────────────────────┤
│  Prisma → PostgreSQL                                          │
└──────────────────────────────────────────────────────────────┘
```

### Why the query layer is split three ways

`lib/data/public.ts`, `account.ts` and `admin.ts` are separated by *audience*,
not by entity. Each file carries its own invariants:

- **public.ts** — only `PUBLISHED`/`APPROVED` rows, and every projection is
  explicitly free of customer PII, staff notes and internal fields. A new public
  page cannot accidentally leak a draft or a private column.
- **account.ts** — every function takes `userId` and scopes on it *inside the
  query*. There is deliberately no "get any booking" helper, so a route cannot
  forget the ownership filter.
- **admin.ts** — staff projections. Still explicit `select`; still no password
  hashes.

---

## Request lifecycle for a protected API route

```
1. authenticate   requireUser() / requirePermission(key)
2. rate limit     bucketed by user and/or IP
3. validate       Zod schema parses the body — unknown fields are dropped
4. authorize      object-level ownership or staff permission
5. act            business logic, in a transaction where integrity matters
6. audit          recordAudit() for security- or money-sensitive actions
7. notify         notifyUser() / notifyStaffWithPermission()
8. respond        apiSuccess() / typed error — never a raw stack
```

`apiHandler()` wraps every route so `AuthError`, `ZodError` and `BusinessError`
map to safe responses and anything else becomes a generic 500 with the detail
logged server-side only.

---

## Domain model

### Identity and access

`User → UserRole → Role → RolePermission → Permission`

Roles are containers for permissions; **authorization always tests a
permission**, never a role name. The one exception is `SUPER_ADMIN`, which
short-circuits to true in `hasPermission()` and is the only role allowed to
grant itself.

Sessions are database-backed. The cookie holds a signed JWT that references a
`Session` row — so logout, suspension and password change take effect
immediately rather than waiting for token expiry.

### Travel catalogue

`Destination` is the hub. `Event`, `Tour`, `Activity` and `Accommodation` all
reference it optionally, which is what lets a destination page surface live
related content with no manual curation.

- `Event` carries `capacity` and `reservedSeats` — the pair the booking
  transaction guards.
- `Accommodation → RoomType → RoomInventory` gives per-date availability.
  Inventory rows are created on demand and seeded from `RoomType.totalUnits`.

### Bookings

`Booking → BookingItem` with a **price snapshot** on every item. `RoomBookingHold`
records which room-nights a booking claimed, so release is exact and idempotent.

`Booking.status` (lifecycle) and `Booking.paymentStatus` (money) are separate
because they genuinely move independently — a confirmed booking can be refunded,
a paid booking can be cancelled.

### Finance

Verifying a payment writes a `FinancialTransaction` in the same transaction as
the status change, so the ledger and the booking can never disagree. Income and
operating expenses are separate `TransactionType` values and are never netted
into a single figure.

---

## The booking engine

`src/lib/booking.ts` is the only place inventory changes.

### Event seats

```ts
// The read is for the error message. The conditional update is the guard.
const claimed = await tx.event.updateMany({
  where: {
    id: eventId,
    status: PUBLISHED,
    reservedSeats: { lte: capacity - quantity },   // ← the invariant
  },
  data: { reservedSeats: { increment: quantity } },
});
if (claimed.count === 0) throw new BusinessError('…seats were just taken…');
```

Running at `Serializable`, two concurrent requests for the last seats cannot both
match the guard. PostgreSQL aborts one with a serialization failure (`40001`,
surfaced by Prisma as `P2034`); `withSerializationRetry` retries it with jittered
backoff, so the customer gets either a booking or an honest "sold out" — never a
500.

### Room-nights

Every night in the stay must independently pass
`bookedUnits + units <= totalUnits`, all inside one Serializable transaction. An
overlapping booking cannot slip between nights.

### Release

`releaseBookingInventory()` returns seats and room-nights on cancel, refund or
expiry. Room holds are deleted as they are released, making the call idempotent —
a repeat cannot double-credit availability.

---

## Design system

All colour, radius and shadow values are CSS custom properties defined once in
`src/app/globals.css`:

- `:root` defines the complete light palette.
- `.dark` redefines the same tokens.
- Tailwind's `@theme` maps them to utility names (`bg-primary`, `text-muted-foreground`).

Components never hardcode a hex value, so light and dark stay in sync and a
rebrand is a single-file change.

Theme selection is read through `useSyncExternalStore` (localStorage + the OS
media query are external stores), and an inline script in `<head>` applies the
stored theme before first paint so dark-mode visitors never see a white flash.

Reduced motion is honoured globally, including for the project's own keyframes.

---

## Rendering strategy

Almost every route is `force-dynamic`. This is deliberate: pages depend on the
session, on dashboard-managed settings, and on live availability. Caching them
would show stale seat counts — the one thing the PRD is emphatic about.

Performance comes from Server Components (minimal client JS), explicit `select`
projections, `Suspense` boundaries with skeletons on the homepage, database
indexes on every filtered column, and pagination everywhere.
