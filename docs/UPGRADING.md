<!-- docs/UPGRADING.md -->
# Upgrading a live site from v1 to v2

For a database that already has real customers, bookings and content in it.

**Do not run `npm run db:seed` on a live database.** The seed is for a fresh
install. It rewrites the itineraries and options of the demo events and tours it
originally created, and resets the settings it owns. Use `npm run db:upgrade`
instead — it exists precisely so this is not a judgement call.

---

## What to install

On the server, once:

| Requirement | Version | Check |
| --- | --- | --- |
| Node.js | 20 or newer | `node -v` |
| npm | comes with Node | `npm -v` |
| PostgreSQL | 14 or newer (16 tested) | `psql --version` |

Nothing else is required. Cloudinary, the travel assistant and live flight data
are optional and each degrade to a stated fallback when their key is absent.

---

## The upgrade, step by step

### 1. Back up first

Not optional. Everything below is designed to be safe, and a backup is still
the only thing that makes a mistake recoverable.

```bash
pg_dump -U <user> -d <database> -F c -f wps-backup-$(date +%F).dump
```

Check the file is not empty before continuing:

```bash
ls -lh wps-backup-*.dump
```

### 2. Put the new code in place

Keep your existing `.env` — it holds your database URL, your `AUTH_SECRET` and
your Cloudinary keys, and none of them change.

```bash
# unzip the new version next to the old one, then from inside it:
cp /path/to/your/old/site/.env .env
npm ci
```

Compare your `.env` against `.env.example` and add any new keys you want. All of
them are optional:

| Key | Without it |
| --- | --- |
| `ANTHROPIC_API_KEY` | The travel assistant tells visitors it is not configured and points them at the contact form |
| `FLIGHT_API_KEY` | Flight schedules come from your dashboard and are labelled as agency-maintained |

### 3. Apply the database migration

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies only migrations that have not run yet. The v2 migration
is purely additive — it creates three new tables (`HeroSlide`, `DashboardPage`,
`RolePageAccess`), one new enum, and adds one column with a default. There is no
`DROP`, no `DELETE`, and no column change. Nothing you have can be lost by it.

> **Never run `prisma migrate reset` or `prisma db push` on a live database.**
> `reset` drops everything and re-seeds. `db push` can drop columns to make the
> database match the schema. `migrate deploy` is the only one that is safe here.

### 4. Add what v2 introduced

```bash
npm run db:upgrade
```

This adds the nine new permissions, gives the built-in roles the ones they
should hold, creates the settings rows v2 added, and registers the dashboard
page list that per-role access is configured against.

It prints your row counts before and after so you can see for yourself that
nothing moved:

```
  Your data, before and after:

    users                       8 → 8
    bookings                    6 → 6
    payments                    4 → 4
    ...
  Nothing was added or removed. Your data is untouched.
```

It is safe to run more than once.

**This step is not optional if anyone other than the owner uses the dashboard.**
A SUPER_ADMIN bypasses the permission table entirely, so the owner would see the
new features regardless — but an ADMIN, CONTENT_MANAGER or any other role would
not, because the permission rows would not exist yet.

### 5. Build and restart

```bash
npm run build
npm run start
```

---

## What `db:upgrade` will and will not touch

**It writes:**

- the nine permissions v2 added
- the built-in role → permission mapping, adding and removing individual rows
  rather than clearing a role and rebuilding it
- settings rows for keys that do not exist yet
- the dashboard page list

**It never touches:**

- users, their passwords, or roles you created yourself
- bookings, payments, invoices, financial transactions
- destinations, events, tours, activities, stays, visa content
- leads, support tickets, reviews, notices, adverts, media
- the value of any setting that already exists — if you have set your own brand
  name or phone number, an upgrade must not quietly put the default back

---

## How this was verified

Not by reading the code. A copy was taken of a database containing 8 users, 6
bookings, 4 payments, 3 invoices and the full catalogue. The v2 tables,
permissions, settings and migration record were removed from it so it was
genuinely v1-shaped. Then `migrate deploy` and `db:upgrade` were run against it.

Result: every row count identical before and after, password hashes byte-for-byte
unchanged, the owner able to sign in with their existing password, existing
bookings still listed in the dashboard, and a CONTENT_MANAGER able to reach the
new hero page while still being refused the page-access grid. Running
`db:upgrade` a second time changed nothing.

---

## If something goes wrong

Restore the backup:

```bash
dropdb <database> && createdb <database>
pg_restore -U <user> -d <database> wps-backup-<date>.dump
```

Then start the old version again. Nothing in v2 writes to your data in a way
that the previous version cannot read, so rolling back is a code change, not a
data migration.

---

## Adding the cancellation FAQs

v2.1 adds four cancellation and refund questions to the seed, because the site
had none — a real gap for a travel business. They arrive automatically on a
fresh install. To add them to a live database without running the seed, run
this once. It is additive and safe to run twice.

```sql
INSERT INTO "FaqItem" (id, question, answer, category, "sortOrder", status, "createdAt", "updatedAt") VALUES
('seed-faq-cancel-1',
 'Can I cancel my booking, and will I get my money back?',
 'Yes, you can cancel from your account or by contacting us. What you get back depends on how close to departure you cancel — the free cancellation window is set per trip and shown on the booking page before you pay. Cancel inside that window and you are refunded in full; after it, the refund reduces as departure approaches because we have already committed to transport and accommodation. The full terms are on our cancellation policy page.',
 'CANCELLATION', 20, 'PUBLISHED', now(), now()),
('seed-faq-cancel-2',
 'How long does a refund take to reach me?',
 'Once approved, refunds are sent back to the number or account the payment came from, normally within three to five working days. bKash and Nagad are usually same-day once processed. We notify you when it is sent — if it has not arrived after a week, tell us and we will trace it.',
 'CANCELLATION', 21, 'PUBLISHED', now(), now()),
('seed-faq-cancel-3',
 'What if you cancel the trip?',
 'You get every taka back, including any service fee, and you are told as early as we know. That is the one case where a full refund is automatic no matter how close to departure it happens. Where we can, we offer a transfer to another date instead, but the choice is yours.',
 'CANCELLATION', 22, 'PUBLISHED', now(), now()),
('seed-faq-cancel-4',
 'Can I move my booking to a different date instead of cancelling?',
 'Usually yes, and it is often better for both of us than a cancellation. Ask us before your free cancellation window closes and we will move you to another departure of the same trip at no charge, subject to seats. After that window a date change is treated like a cancellation and rebooking.',
 'CANCELLATION', 23, 'PUBLISHED', now(), now())
ON CONFLICT (id) DO NOTHING;
```

Edit the wording to match your actual terms before running it — these are
sensible defaults, not a policy anyone has agreed on your behalf.

---

## v2.3 — the blog

Adds `/blog` with categories, reader comments and dashboard moderation.

### Applying it

```bash
npx prisma generate
npm run db:deploy    # adds three tables and six columns; touches no existing row
npm run db:upgrade   # grants the new permissions and adds starter categories
npm run build
```

`db:deploy` runs `20260829140000_blog_categories_comments`, which is purely
additive: `CREATE TABLE` for `PostCategory` and `PostComment`, `ADD COLUMN` on
`Post`, and indexes. There is no `DROP`, no `ALTER … TYPE`, and no data
migration, so existing posts keep their content and simply gain empty category
and author columns.

`db:upgrade` is the step that matters for staff access. It grants the eight new
permissions (`blog.read`, `blog.manage`, `blog.publish`, `blog.delete`,
`blog.categories.manage`, `comments.read`, `comments.moderate`,
`comments.delete`) to the built-in roles, and creates five starter categories —
but **only if you have none at all**. A category you created yourself is never
touched.

### Who can do what afterwards

| | Write & draft | Publish | Delete a post | Moderate comments | Delete a comment |
| --- | --- | --- | --- | --- | --- |
| Super Admin | yes | yes | yes | yes | yes |
| Admin | yes | yes | yes | yes | yes |
| Moderator | yes | yes | no | yes | no |
| Content Manager | yes | yes | no | yes | no |
| Support Agent | no | no | no | no | no |
| Finance Manager | no | no | no | no | no |

Moderator also gains `media.upload`, without which the cover-image and in-body
image uploads would fail for the role that is now expected to write posts.

### The old /guides URLs

`/guides` and `/guides/<slug>` now issue a 308 permanent redirect to `/blog`
and `/blog/<slug>`. The section was not duplicated: two URLs serving the same
articles splits their search ranking, and every existing link keeps working.
Posts appear in the sitemap under `/blog/...`, and categories that have at
least one published post get their own entry.

### Comments

Every comment is created `PENDING` and is invisible until a moderator approves
it in **Dashboard → Blog → Comments**. Rejecting keeps the row so a decision
can be reversed; deleting is permanent and needs `comments.delete`.

A comment's email address is collected so staff can reply and is never
projected into any public query — the page cannot render it even by mistake.
The submitter's IP is stored only as a truncated SHA-256 hash.

### Writing a post

The body is Markdown, rendered by `src/lib/markdown.tsx` into React elements —
never through `dangerouslySetInnerHTML`. Raw HTML in a post is displayed as
text rather than parsed, so an author cannot inject script.

Headings in the body start at `##`. The post title is the page's only `<h1>`;
a single `#` is rendered as an `<h2>` rather than competing with it.

"Insert image" in the editor toolbar uploads through the same signed Cloudinary
flow as the cover image and writes `![alt](url)` at the cursor, so pictures can
sit anywhere in the article. The description you type becomes both the caption
and the alt text.

---

## v2.5 — the contest

Adds `/contest`: entries from signed-in visitors, public voting, judging, and
a winners announcement, all controlled from the dashboard.

### Applying it

```bash
npx prisma generate
npm run db:deploy    # seven new tables, one new column; touches no existing row
npm run db:upgrade   # grants the six new permissions
npm run build
```

The migration is additive only — `CREATE TABLE` for the contest and its six
child tables, `ADD COLUMN durationSeconds` on `MediaAsset`, and indexes. No
`DROP`, no data migration.

### Who can do what

| | Draft | Publish & edit live | Delete | Moderate entries | Score & place |
| --- | --- | --- | --- | --- | --- |
| Super Admin | yes | yes | yes | yes | yes |
| Admin | yes | yes | yes | yes | yes |
| Content Manager | yes | yes | no | yes | yes |
| Moderator | no | no | no | yes | no |
| Support Agent | read only | no | no | no | no |

Screening what the public uploaded and deciding who wins are separate
permissions: a moderator clears entries, but the placings stay with the people
the agency calls judges.

### The dates run everything

There is no "start the contest" button, and nothing to remember to switch off.
The phase is worked out from the dates every time a page is rendered:

| Phase | When | What the public sees |
| --- | --- | --- |
| Opening soon | before `startAt` | the contest, no entry form |
| Entries open | `startAt` → `entryDeadline` | the entry form |
| Under review | deadline → `votingStartAt` | approved entries |
| Voting open | `votingStartAt` → `votingEndAt` | the shortlist, with vote buttons |
| With the judges | after `votingEndAt` | the shortlist, voting closed |
| Results | after `resultsAt` | the winners |

Leave `votingStartAt` and `votingEndAt` blank to run a contest with no public
vote. Winners stay hidden until `resultsAt` no matter when they were marked, so
the placings can be decided quietly in advance.

The navbar link and the home page section appear on their own while a contest
is published and running, and disappear a fortnight after the results.

### Setting one up

1. **Dashboard → Contests → New contest.** Save as a draft.
2. Add **prizes**, **judges**, **sponsors** and **gallery** images from the
   links on the contest page.
3. Set the dates, then change the status to **Published**.
4. Entries arrive in **Entries**, all `PENDING`. Approve or reject each one.
5. When entries close, mark your best ones **Shortlist** — up to the shortlist
   size you set.
6. Voting opens on its date. Vote counts stay hidden from the public.
7. Give each shortlisted entry a **mark out of 100**. The queue shows a
   combined score mixing your mark with the public vote at the weight you set.
8. Set **1st, 2nd and 3rd**. They go public on the results date.

### Entry rules

Per contest: photos or videos or both, a size cap for photos (2 MB by default),
a length cap for videos (20 seconds), and how many entries one person may send.

Both caps are checked twice — in the browser before the upload starts, so
nobody waits four minutes to be told their clip is too long, and again on the
server by reading the file back from Cloudinary. Only the second one decides.
An upload that breaks the rules is deleted from Cloudinary rather than left
sitting in the account.

### Voting

One signed-in person, one vote per contest, enforced by a unique database index
rather than a check that two simultaneous requests could both pass. Vote counts
are hidden while voting is open, so people judge the pictures instead of the
scoreboard.
