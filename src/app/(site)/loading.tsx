// src/app/(site)/loading.tsx
import { Container } from '@/components/ui/section';
import { CardGridSkeleton, Skeleton } from '@/components/ui/skeleton';

/**
 * In-shell loading state for every public page.
 *
 * The header and footer are already on screen by this point, so replacing the
 * body with the full-screen splash would be a step backwards — it would hide
 * navigation the visitor can still use and make the site feel slower than it
 * is. A skeleton in roughly the shape of the incoming page keeps the layout
 * from jumping when the real content lands.
 */
export default function SiteLoading() {
    return (
        <div role="status" aria-live="polite">
            {/* Thin determinate-looking bar so the wait is visible above the fold. */}
            <div className="wps-progress h-0.5 w-full rounded-none" />

            <Container className="py-12 sm:py-16">
                <div className="max-w-2xl space-y-4">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-9 w-4/5 sm:h-11" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                </div>

                <div className="mt-10 flex flex-wrap gap-2.5">
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-32 rounded-full" />
                </div>

                <div className="mt-10">
                    <CardGridSkeleton count={6} />
                </div>
            </Container>

            <span className="sr-only">Loading page content.</span>
        </div>
    );
}