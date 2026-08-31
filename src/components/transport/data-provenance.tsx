import { Clock, Database, Radio } from 'lucide-react';

import { relativeTime } from '@/lib/utils';

/**
 * States plainly where a schedule came from and how old it is.
 *
 * Travellers plan connections around these timings. A page that shows a
 * schedule without saying whether it is live or was last confirmed three weeks
 * ago is inviting someone to miss a flight, so this label is not decoration —
 * it is the honest part of showing the data at all.
 */
export function DataProvenance({
  source,
  updatedAt,
  liveAvailable,
  what = 'timings',
}: {
  source: 'live' | 'agency';
  updatedAt?: Date | null;
  liveAvailable?: boolean;
  what?: string;
}) {
  if (source === 'live') {
    return (
      <p className="flex items-center gap-2 rounded-field border border-success/30 bg-success-soft px-3.5 py-2.5 text-xs text-success">
        <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Live {what} from the airline feed
        {updatedAt && <>, checked {relativeTime(updatedAt)}</>}. Fares and seats are
        still confirmed by us before you pay.
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-field border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
      <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {what.charAt(0).toUpperCase() + what.slice(1)} maintained by our team
        {updatedAt && (
          <>
            , last confirmed{' '}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {relativeTime(updatedAt)}
            </span>
          </>
        )}
        .{' '}
        {liveAvailable === false
          ? 'No public live feed exists for these services, so always confirm with the operator before travelling.'
          : 'Confirm with the operator before travelling.'}
      </span>
    </p>
  );
}
