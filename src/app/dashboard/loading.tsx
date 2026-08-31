// src/app/dashboard/loading.tsx
import { DashboardSkeleton } from '@/components/ui/skeleton';

/**
 * In-shell loading state for the dashboard.
 *
 * Without this file the nearest boundary above is `app/loading.tsx`, so every
 * move between dashboard pages would blank the sidebar and play the arrival
 * splash — an animation meant to be seen once per visit, shown on every click.
 * Staff navigate constantly; they get a skeleton in the shape of the page and
 * keep their navigation.
 */
export default function DashboardLoading() {
    return (
        <div role="status" aria-live="polite" className="space-y-6">
            <div className="wps-progress h-0.5 w-full" />
            <DashboardSkeleton />
            <span className="sr-only">Loading dashboard.</span>
        </div>
    );
}