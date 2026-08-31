// src/app/not-found.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  LifeBuoy,
  MapPin,
  Mountain,
  Plane,
  StampIcon,
  Tent,
} from 'lucide-react';

import { PeakMark, RidgeBackdrop } from '@/components/brand/peak-mark';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found',
  // A 404 that gets indexed competes with the real pages for the same terms.
  robots: { index: false, follow: true },
};

/**
 * Root 404.
 *
 * It cannot rely on the site layout, which needs a database round trip, so it
 * is self-contained and renders even when the database is unreachable. That
 * constraint is also why the artwork is inline SVG rather than an image file.
 *
 * The shortcuts below are the point of the page. A visitor who mistyped a URL
 * or followed a stale link has a goal; "go home" makes them start their search
 * over, so the common destinations are offered directly instead.
 */

const SHORTCUTS = [
  { href: '/tours', label: 'Tours', hint: 'Curated trips', icon: Mountain },
  { href: '/destinations', label: 'Destinations', hint: 'Where to go', icon: MapPin },
  { href: '/stays', label: 'Stays', hint: 'Hotels & resorts', icon: Tent },
  { href: '/visa', label: 'Visa', hint: 'Requirements', icon: StampIcon },
  { href: '/flights', label: 'Flights', hint: 'Schedules', icon: Plane },
  { href: '/blog', label: 'Blog', hint: 'Travel guides', icon: BookOpen },
];

export default function NotFound() {
  return (
    <div className="wps-aurora relative flex min-h-dvh flex-col overflow-hidden">
      <RidgeBackdrop />

      <header className="relative z-10 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-field focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Wild Peak Souls
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-16">
        <div className="wps-animate-in w-full max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
            Error 404
          </span>

          <div className="relative mt-7 flex justify-center">
            {/* The numeral sits behind the mark so the brand reads first. */}
            <span
              aria-hidden="true"
              className="select-none font-display text-[104px] font-bold leading-none tracking-tighter text-primary/12 sm:text-[148px]"
            >
              404
            </span>
            <PeakMark className="absolute top-1/2 h-16 w-16 -translate-y-1/2 text-primary sm:h-20 sm:w-20" />
          </div>

          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            This trail does not go anywhere
          </h1>
          <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
            The page has moved, or the trip it described has been archived.
            Nothing is broken on your side — pick a path below and carry on.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/" size="lg" className="sm:min-w-44">
              Back to home
            </ButtonLink>
            <ButtonLink href="/tours" variant="outline" size="lg" className="sm:min-w-44">
              Browse trips
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <nav aria-label="Popular sections" className="mt-12">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Or jump straight to
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {SHORTCUTS.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex h-full items-center gap-3 rounded-card border border-border bg-card/70 p-3 text-left backdrop-blur-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-field bg-primary-soft text-primary">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hint}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-8 text-center sm:px-8">
        <p className="text-sm text-muted-foreground">
          Still cannot find it?{' '}
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Talk to our team
          </Link>
        </p>
      </footer>
    </div>
  );
}