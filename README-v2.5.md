<!-- README-v2.5.md — read this first -->

# Wild Peak Souls — v2.5: the Contest

61 files. Each starts with a comment giving its path — copy it to that exact
location, replacing the file that is there.

**No data is deleted.** The migration only adds tables and one column.

## Apply

```bash
npx prisma generate
npm run db:deploy    # 7 new tables + 1 column. No DROP, no row touched.
npm run db:upgrade   # grants the 6 new permissions
npm run build
npm run doctor       # confirms it all landed
```

Nothing new is needed in `.env`.

## What you get

**Public — `/contest`**

One page carrying every section, each appearing when it should:

| Section | Shows when |
| --- | --- |
| About, theme, key dates | always |
| Prizes, judges, sponsors, gallery | when you have added them |
| **Entry form** | between the opening date and the deadline |
| Recent entries | after you approve some |
| **Voting grid** | between the voting dates |
| **Winners** | after the results date |
| Rules | always |

**Entry form asks for:** name, email, phone, Facebook/LinkedIn, location,
description, and one photo (2 MB) or video (20 seconds). Entrants must be
signed in.

**Dashboard → Contests**

- Contest list with the current phase of each
- Settings: dates, entry rules, vote weight, shortlist size, status
- **Prizes**, **Judges**, **Sponsors**, **Gallery** — each with its own manager
- **Entries** queue: Approve / Reject / Shortlist / Back to pending, a mark out
  of 100, and 1st / 2nd / 3rd placings

## The dates run everything

There is no "start" button and nothing to switch off afterwards.

| Phase | When |
| --- | --- |
| Opening soon | before the opening date |
| Entries open | opening date → deadline |
| Under review | deadline → voting opens |
| Voting open | voting dates |
| With the judges | after voting closes |
| Results | after the results date |

The **navbar "Contest" link** and the **home page section** appear on their own
while a contest is live, and go away a fortnight after the results. Leave the
voting dates blank to run a contest with no public vote.

Winners stay hidden until the results date however early you mark them — so you
can decide quietly in advance.

## How the winner is decided

You set a **mark out of 100** for each shortlisted entry. The public vote is
scored as a share of the most-voted entry. The queue shows a **combined score**:

```
combined = judges' mark × (100 − weight)%  +  vote share × weight%
```

`weight` is the "Public vote weight" you set — 25% by default, which is what
you described. The score ranks the list; **you** set 1st, 2nd and 3rd. The
judges decide, with the public weighing in.

## Running one, start to finish

1. **New contest** → fill it in → save as **Draft**
2. Add prizes, judges, sponsors, gallery from the links on the contest page
3. Set the dates → change status to **Published**
4. Entries arrive in **Entries** as Pending → **Approve** or **Reject** each
5. After the deadline, **Shortlist** your best (up to the shortlist size)
6. Voting opens by itself on its date
7. Give each shortlisted entry a **mark**
8. Set **1st, 2nd, 3rd** → they go public on the results date

## Safety, briefly

- Entrants must be signed in — one person cannot enter under many names, and
  you have an account to contact if they win
- **The 2 MB and 20-second limits are checked on the server**, by reading the
  file back from Cloudinary. The browser is not believed. A file that breaks
  them is deleted rather than left in your account
- **One vote per person per contest**, enforced by the database, not by a check
  that could be raced
- Vote counts are hidden while voting is open, so people judge the pictures
- Nothing an entrant uploads is public until you approve it
- Entrants' emails and phone numbers are never rendered on a public page
- Deleting a contest that has entries archives it instead — those are somebody's
  photographs and somebody's votes

## Two bugs fixed along the way

Both found by the test suite while building this.

1. A second vote from the same person returned a generic "value already in use"
   instead of explaining they had already voted. The check used `instanceof`
   against a Prisma error class, which is false when the error comes from the
   other of the two Prisma clients in the project.
2. The upload endpoint reported a Cloudinary configuration problem before
   noticing the contest was closed — telling people about a hosting issue that
   was neither theirs nor the reason they could not enter.

## Verified before packaging

331 automated checks passing, of which 83 are new and cover this feature:
authorization for every role, date validation, the entry gates, a second vote
being refused, placings moving correctly between entries, and winners staying
hidden until their date. Lighthouse on the contest page: **accessibility 100,
SEO 100**, performance 96.
