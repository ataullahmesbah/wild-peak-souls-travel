# Wild Peak Souls v2 — what changed

v1 shipped a complete travel platform whose dashboard could read the catalogue
but not change it, and which had a handful of defects that only showed up under
real use. v2 closes both.

Every item below was verified against a live database and a production build.
Where something was found by testing rather than by reading the code, that is
said, because it is the more useful fact.

---

## The largest gap: editing the catalogue

The dashboard had no create or edit screens for the twelve catalogue modules.
It now has all of them: destinations, events, tours, activities, stays, visa
countries and types, notices, advertisements, hero slides, flight routes and
train schedules.

Rather than twelve near-identical forms, forms are described as data. A module
supplies a field list; `ResourceForm` handles typing, server field errors, and
the save. This matters because an HTML form only ever produces strings: the
serialiser turns them into the numbers, instants and booleans the API expects,
and omits an untouched optional field rather than sending an empty string that
a format check would reject.

Events and stays additionally own child rows — itinerary days, paid options,
policies, room types. Those are plain inputs named `group[index].field` inside
the same form, so parent and children save in one transaction, and a room
type's id survives an edit instead of orphaning the bookings that point at it.

Deleting always goes through a confirmation naming the record, and reports what
actually happened: the API archives anything another record depends on, and the
toast says so rather than claiming a deletion that did not occur.

---

## Security

**The vulnerability v1 shipped with.** An ADMIN could demote *or suspend* a
SUPER_ADMIN. In v1 the target's roles were read only to build an audit record
and never used in an authorization decision. Suspension revokes every session,
so an ADMIN could have locked the owner out of their own platform immediately.

The fix is a rank check, deliberately placed before any branch so it covers
role changes, status changes and anything added later. Permissions answer *may
this actor do this action*; rank answers *may they do it to this person*.

v1's test suite asserted only that an ADMIN could not **grant** SUPER_ADMIN —
the role being handed out. It never tested the role being **acted upon**. That
gap is why the bug shipped, and the suite now covers both directions.

**Page-level access control.** A grid of roles against dashboard pages, where
unticking a box hides a page from a role. It can only take access away: a role
without a page's permission still cannot use it however the grid is set, so the
worst a mistake here can do is hide something. The SUPER_ADMIN column is fixed
on and the server ignores writes to it — the owner's way back into their own
dashboard must not be closeable by a mis-click. Enforcement matches the longest
declared path, so `/dashboard/events/new` is governed by its parent rather than
falling through to allowed.

**The AI assistant's boundary is structural, not instructional.** The model has
six hand-written tools that read published pages. It is never handed a database
client or a session. No tool reads User, Booking, Payment, Session, AuditLog,
leads, support tickets or secret settings — not filtered, absent — and no tool
takes a user id, booking reference or email. A prompt that talks the model into
trying to fetch someone's booking finds nothing to call, which holds even when
the instructions are ignored, and instructions eventually are.

---

## Defects found by testing

These were not in the brief. They were found by driving the site in a real
browser and by measuring it.

| What | Why it mattered |
| --- | --- |
| A visually-hidden label inside the delete button anchored to the page, not the button | Gave the dashboard a **391px phantom horizontal scrollbar** on a phone, from inside a scrolling table |
| The decorative `.wps-aurora` wash bleeds 10% past each edge | **39px of horizontal scroll on every public page** at 390px |
| Adding the notification bell pushed the header past the viewport | Another **11px** of scroll, for signed-in visitors only |
| `/visa/[country]` did not exist — only `/visa/[country]/[type]` | Every country URL was a dead link |
| `/support` was linked from every page footer and 404'd | It is where people go when something has already gone wrong |
| The site had no favicon at all | Every browser's automatic request was a 404 |
| `relativeTime` subtracted in one direction only | Any **future** date rendered as "just now" |
| `--warning` measured 4.23:1 on `--warning-soft` | Under the 4.5:1 minimum, on every warning badge and notice |
| Hero slide dots were 8px buttons | Failed the 24px minimum touch target |
| The CRUD factory exported a slug check it never called | A duplicate slug surfaced as an unhandled 500 |

---

## Everything else

**Dashboard.** Sidebar with brand, sub-pages, a collapse control, and the
signed-in person's name, email and role. The notification bell opens a popup
instead of navigating away, and reading it clears the count. Users are listed
per role with live counts, and rows the actor outranks show why rather than
offering a button that would be refused. The audit log reads in plain words
with the machine key kept as secondary detail.

**Leads.** Contact messages, custom tour requests, flight enquiries and visa
requests each have a detail page with status, ownership, internal notes and —
for custom tours — the amount quoted. Status and notes save together, so there
is no half-saved state where a lead is marked contacted but the note explaining
what was agreed is lost.

**Business.** An accounts ledger showing what was billed, received, awaiting
verification and still owed — computed from verified payments rather than a
status flag, so it agrees with the bank. A submitted payment screenshot counts
as awaiting verification, never as received. Reports export as CSV with a UTF-8
BOM (without it Excel mangles Bangla names and the taka sign) and with formula
injection defused, since those cells hold text typed by the public.

**Settings.** Declared in code with descriptions written for whoever runs the
agency, and seeded automatically, so a new setting is never an unlabelled key.
Adds social links, support contacts, opening hours, company registration, home
page fallback wording, and the site credit.

**Media.** Uploads are signed server-side into a closed list of folders.
Deleting removes the file from Cloudinary as well as the row — Cloudinary
first, so a failure leaves the record to retry rather than stranding the file.
An image still attached to something is refused with the places naming it. The
library reports what is attached to nothing, which is the number worth acting
on.

**Public site.** A dashboard-controlled hero banner with scheduling applied
server-side. Stays and hotels as separate strips, each absent entirely when
empty. Reviews on event pages, contributing an aggregate rating only when there
is something to aggregate. The most-asked questions on the home page as
`<details>`, so the answers are in the markup where a search engine or an
assistant can read them. Advertisements honour a per-viewer frequency cap.

**Search and answer engines.** TravelAgency and WebSite structured data on
every page, built from Settings. `/llms.txt` gives an assistant the whole
catalogue in one request, so an answer can cite a page that exists rather than
inventing a plausible one. It carries published content only.

**Transport.** Flight schedules come through an adapter that prefers a live
provider and falls back to agency-maintained rows, with a four-second timeout
so an outage costs a freshness label rather than the page. Both pages state
where their timings came from and how old they are — travellers plan
connections around these, and a schedule shown without provenance reads as
live.

**Design system.** 269 inline `[var(--token)]` utilities across 86 files became
the theme utilities that already existed for them; computed styles verified
identical afterwards. Date inputs echo the chosen day back in full, which is
where a mistyped year is actually caught.

---

## Measured result

| | v1 | v2 |
| --- | --- | --- |
| Automated assertions | 105 | 143, plus 25 in a real browser |
| Lighthouse performance | — | 95–97 across nine pages |
| Lighthouse accessibility | 94–97 | **100** across nine pages |
| Lighthouse SEO | — | 100 |
| Catalogue modules with full CRUD | 0 | 12 |
| Inline CSS variable utilities | 269 | 0 |

Best practices reads 96 on pages carrying seed photography, because the
development sandbox's proxy blocks Unsplash with a 403. Pages without seed
images score 100, and the same requests succeed in a real deployment.
