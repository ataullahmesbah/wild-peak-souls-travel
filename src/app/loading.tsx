// src/app/loading.tsx
import { PeakMark, RidgeBackdrop } from '@/components/brand/peak-mark';

/**
 * First-entry splash.
 *
 * This is the outermost loading boundary, so it covers the wait before the
 * site shell itself exists — the header needs a session, settings and the
 * active notices before it can render. Once the shell is up, the nested
 * boundaries in `(site)` and `dashboard` take over, which is what keeps this
 * full-screen takeover to the one moment it belongs: arriving.
 *
 * `role="status"` with a polite live region tells a screen reader the page is
 * working; without it the wait is silent and reads as a broken link.
 */
export default function Loading() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="wps-aurora relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6"
        >
            <RidgeBackdrop />

            <div className="relative z-10 flex flex-col items-center">
                <PeakMark animated className="wps-breathe h-16 w-16 text-primary sm:h-20 sm:w-20" />

                <p className="mt-6 font-display text-lg font-semibold tracking-tight sm:text-xl">
                    Wild Peak Souls
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">Preparing your journey…</p>

                <div className="wps-progress mt-7 h-1 w-44 sm:w-56" />
            </div>

            <span className="sr-only">Loading, please wait.</span>
        </div>
    );
}