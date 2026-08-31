# Troubleshooting

## Turbopack panics on Windows: "os error 1392"

```
FATAL: An unexpected Turbopack error occurred.
[Server HMR] Subscription error, resubscribing:
  Error [TurbopackInternalError]: reading file \\?\D:\...\.next\dev\server\chunks\....js.map
Caused by:
- The file or directory is corrupted and unreadable. (os error 1392)
```

**This is not an application error.** `1392` is Windows' `ERROR_FILE_CORRUPT`.
Turbopack cannot read a file it wrote itself, inside its own cache under
`.next/dev/`. Nothing in `src/` is involved.

The symptoms it produces look like application bugs, which is what makes it
confusing:

| What you see | Why |
| --- | --- |
| Pages take 10-30s instead of under 1s | Turbopack recompiles after every panic |
| Image upload fails | the corrupt chunk is `api_dashboard_media_sign_route` |
| The media page will not render | the corrupt chunk is `api_dashboard_media_library_route` |
| `Module ... was instantiated ... but the module factory is not available` | a stale or unreadable chunk |
| `The destination stream closed early` | you refreshed while a 20s render was still streaming |
| A random `500` on a page that worked a moment ago | same |

### Fix it

```bash
# 1. Stop the dev server (Ctrl+C)
npm run clean     # deletes .next entirely
npm run dev
```

Then hard-reload the browser (Ctrl+Shift+R) so it drops the chunks it cached
from the broken run.

### If it comes back

Something on the machine is corrupting files while Turbopack writes them.
In rough order of likelihood:

1. **Antivirus.** Windows Defender (or any other) scanning `.next` while it is
   being written is the usual cause. Add the project folder to the exclusion
   list: Windows Security → Virus & threat protection → Manage settings →
   Exclusions → Add folder.

2. **Cloud sync.** If the project sits in OneDrive, Dropbox or Google Drive,
   move it out. These rewrite files underneath the compiler, and `.next`
   changes thousands of times a minute.

3. **A path with a space in it.** The project is at
   `D:\Hyascka Pro\Wild_Peak_Souls_Website_v2.0\wild-peak-souls`. Turbopack
   falls back to Windows' `\\?\` extended-length path form, which is visible in
   the error text and has known rough edges. Moving to a short path with no
   spaces — `D:\wps` — removes a whole class of problems.

4. **The disk.** `chkdsk D: /f` from an elevated prompt, then reboot if it
   asks to schedule.

### Turn off the file that keeps failing

Every path in the panic ends in `.js.map`. Turbopack writes one of those beside
every server chunk in `.next/dev/`, and they are the only files reported
corrupt. They can be switched off:

```bash
# add to .env
WPS_TURBOPACK_SOURCEMAPS=off
```

Then `npm run clean && npm run dev`.

Measured on a clean checkout: 73 `.js.map` files written by default, **0** with
the flag set — including the two whose corruption produced the panic,
`_next-internal_server_app_api_dashboard_media_sign_route_actions_*.js.map` and
`..._media_library_route_actions_*.js.map`. The `.js` chunks are still written,
so everything compiles and runs; every page and both media API routes were
verified to still return 200.

The cost is that a dev stack trace points at compiled output instead of your
source file. Production is unaffected — `npm run build` is a separate
compilation and does not read this variable. Treat it as the escape hatch, not
the fix: the machine is still corrupting files, so work through the list above
when you have time.

### If the panic moves to the `.js` file too

Once source maps are off, the same panic can reappear on the chunk itself:

```
reading file ...\.next\dev\server\chunks\..._media_sign_route_actions_1it4bfh.js
Caused by: The file or directory is corrupted and unreadable. (os error 1392)
```

That is the filesystem, not the compiler, and it means **deleting `.next` is not
actually removing the damaged file**. On NTFS a corrupt directory entry can
survive a recursive delete while the delete itself reports success; Turbopack
then regenerates the same deterministic filename, finds the damaged file
already there, and panics on what looks like a clean build. The identical hash
appearing run after run is the tell.

Point the build somewhere that has never existed:

```bash
# add to .env
WPS_DIST_DIR=.next-clean
```

Then `npm run dev`. `.next-*` is already in `.gitignore`.

`npm run doctor` reports unreadable files inside the build directory, so you
can see whether this is what you are hitting before changing anything.

This still only avoids the damaged area of the disk. Run `chkdsk D: /f` from an
elevated prompt when convenient.

### Fall back to webpack

Turbopack is the default for `next dev` in Next.js 16. If the panics continue
while you work through the list above, use the other bundler:

```bash
npm run dev:webpack
```

Slower to start, but it does not use the cache layout that is failing here.
Nothing else changes — `npm run build` and production are unaffected either
way, because that is a separate compilation.

## "upstream image response failed ... 404"

The demo content shipped by `npm run db:seed` points at Unsplash photo URLs,
and some of those photos have since been removed from Unsplash. It affects
seeded demo rows only. Replace the cover image from the dashboard, or ignore
it — your own uploads go to Cloudinary and are unaffected.

## "Encountered a script tag while rendering React component"

A React 19 development warning, safe to ignore here. It refers to the
`<script type="application/ld+json">` block that carries the page's structured
data for Google and AI crawlers.

React is pointing out that a script inside a component is not *executed*
during a client render — which is exactly what we want. JSON-LD is data, not
code; it is meant to be read out of the HTML, never run. The block is present
in the server-rendered HTML, which is what crawlers fetch. This is the pattern
Next.js documents for structured data.


## "Image hosting is not configured" although Cloudinary is connected

Cloudinary's dashboard shows a single line first:

```
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

That form is now accepted. Either give that one variable, or all three of
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. If
both are present the three explicit ones win.

Check what the server actually sees:

```bash
npm run doctor
```

It prints which form was used, the cloud name, the length of each credential —
never the secret itself — and warns if the key and secret look swapped
(Cloudinary API keys are all digits).

If it still says not configured after you have set the variable, the dev server
was started before the edit. `.env` is read once at startup: stop it and run
`npm run dev` again.

## `npm run doctor`

One command for the things people get stuck on: required environment
variables, Cloudinary, the database connection, whether the migrations and the
blog permissions have actually been applied, and whether anything inside the
build directory is unreadable. Every failure names the command that fixes it.
No secret is ever printed.
