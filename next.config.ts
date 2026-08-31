import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 * CSP is intentionally permissive for Cloudinary + analytics vendors that the
 * dashboard can enable; tighten per-deployment if those are unused.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/**
 * Turbopack writes a `.js.map` beside every server chunk in `.next/dev/`.
 * On some Windows setups those files come back unreadable — Turbopack then
 * panics on every request with `os error 1392` (ERROR_FILE_CORRUPT), the dev
 * server recompiles after each panic, and pages that took under a second start
 * taking twenty. Antivirus, cloud sync and a project path containing a space
 * are the usual culprits; see docs/TROUBLESHOOTING.md.
 *
 * Setting `WPS_TURBOPACK_SOURCEMAPS=off` in `.env` stops those files being
 * written at all, which removes the failure rather than working around it.
 * The cost is that dev stack traces point at compiled output instead of your
 * source, so leave it unset unless you are hitting the panic.
 */
const devSourceMaps = process.env.WPS_TURBOPACK_SOURCEMAPS !== 'off';

/**
 * Where the compiler writes its output. `.next` unless told otherwise.
 *
 * The escape hatch exists for one specific Windows failure: when NTFS marks a
 * file inside `.next` as corrupt (`os error 1392`), deleting the folder does
 * not necessarily remove it — a corrupt directory entry can survive a
 * recursive delete, which then silently succeeds. Turbopack regenerates the
 * same deterministic filename, finds the damaged file already sitting there,
 * and panics again on a supposedly clean build.
 *
 * Pointing the build at a directory that has never existed sidesteps the
 * damaged entry entirely:
 *
 *   WPS_DIST_DIR=.next-clean
 *
 * Add the new folder to .gitignore, and run chkdsk when convenient — the
 * filesystem still needs repairing.
 */
const distDir = process.env.WPS_DIST_DIR?.trim() || '.next';

const nextConfig: NextConfig = {
  distDir,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    turbopackSourceMaps: devSourceMaps,
  },
  // Keep the generated Prisma client out of the module trace — its runtime does
  // dynamic filesystem lookups that would otherwise pull the whole project into
  // the server bundle.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The dashboard moved from /admin to /dashboard. A permanent redirect
      // keeps existing bookmarks and previously-sent notification links working,
      // and preserves search equity.
      { source: '/admin', destination: '/dashboard', permanent: true },
      { source: '/admin/:path*', destination: '/dashboard/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
