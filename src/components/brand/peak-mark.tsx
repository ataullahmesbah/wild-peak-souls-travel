// src/components/brand/peak-mark.tsx
import { cn } from '@/lib/utils';

/**
 * The ridge line the brand is named for, drawn rather than imported.
 *
 * An inline SVG because the two places it matters most — the 404 page and the
 * loading screen — are exactly the moments a network request for a logo file
 * is least likely to have finished. It also inherits `currentColor`, so it
 * needs no separate light and dark asset.
 */
export function PeakMark({
    className,
    animated = false,
}: {
    className?: string;
    /** Draws the ridge in, for the loading screen. Ignored under reduced motion. */
    animated?: boolean;
}) {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            className={cn('h-12 w-12', className)}
        >
            <circle
                cx="24"
                cy="24"
                r="22"
                stroke="currentColor"
                strokeWidth="1.5"
                className="opacity-25"
            />
            <path
                d="M9 32 L18 18 L24 26 L31 13 L39 32 Z"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={animated ? 'wps-draw' : undefined}
            />
            <circle cx="31" cy="13" r="2.6" fill="currentColor" />
        </svg>
    );
}

/**
 * Full-bleed ridge silhouette used as a page backdrop.
 *
 * Three layers at descending opacity read as depth without needing a photo,
 * which keeps the 404 and loading screens free of an image that might itself
 * fail to load.
 *
 * The opacities are capped at 10%. Page footers sit on top of the darkest
 * band, and at the 18% that looked right by eye, `--muted-foreground` over it
 * measured 4.13:1 — under the 4.5:1 minimum for body text. 10% leaves 4.65:1
 * in the light theme and 7.26:1 in the dark one.
 */
export function RidgeBackdrop({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full', className)}
        >
            <path
                d="M0 240 L190 118 L350 205 L520 92 L700 210 L880 130 L1200 232 L1200 400 L0 400 Z"
                className="fill-primary/[0.06]"
            />
            <path
                d="M0 300 L155 208 L325 282 L500 186 L690 288 L945 200 L1200 296 L1200 400 L0 400 Z"
                className="fill-primary/[0.08]"
            />
            <path
                d="M0 352 L240 292 L455 340 L660 278 L865 336 L1055 288 L1200 328 L1200 400 L0 400 Z"
                className="fill-primary/10"
            />
        </svg>
    );
}